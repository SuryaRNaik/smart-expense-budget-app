const tls = require('tls');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const app = require('../../src/app');
const server = require('../../src/server');

/**
 * Resolves the path to the openssl CLI binary if present in PATH or common Git install locations.
 */
const getOpensslBinary = () => {
  try {
    execSync('openssl version', { stdio: 'pipe' });
    return 'openssl';
  } catch (err) {
    const gitOpenssl = 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe';
    if (fs.existsSync(gitOpenssl)) {
      return `"${gitOpenssl}"`;
    }
    return null;
  }
};

/**
 * Probes whether the current Node/OpenSSL runtime can construct a client SSL context
 * targeting TLS < 1.2 (TLSv1/TLSv1.1) with appropriate cipher security level.
 */
const detectLegacyClientSupport = () => {
  try {
    tls.createSecureContext({
      minVersion: 'TLSv1',
      maxVersion: 'TLSv1.1',
      ciphers: 'DEFAULT@SECLEVEL=0',
    });
    return { supported: true, ciphers: 'DEFAULT@SECLEVEL=0' };
  } catch (e1) {
    try {
      tls.createSecureContext({
        minVersion: 'TLSv1',
        maxVersion: 'TLSv1.1',
      });
      return { supported: true, ciphers: undefined };
    } catch (e2) {
      return { supported: false, ciphers: undefined };
    }
  }
};

describe('HTTPS & TLS Configuration (Integration — TC-Sec-02)', () => {
  const opensslBin = getOpensslBinary();
  const hasOpenssl = Boolean(opensslBin);
  const legacyClientInfo = detectLegacyClientSupport();

  // Condition-dependent test runners ensure Jest reports skipped tests accurately
  const itIfOpenssl = hasOpenssl ? it : it.skip;
  const itIfLegacySupported = hasOpenssl && legacyClientInfo.supported ? it : it.skip;

  const tmpDir = os.tmpdir();
  const tmpKeyPath = path.join(tmpDir, `sebm-test-key-${Date.now()}.pem`);
  const tmpCertPath = path.join(tmpDir, `sebm-test-cert-${Date.now()}.pem`);

  let httpsServer = null;
  let httpsPort = null;

  beforeAll((done) => {
    if (!hasOpenssl) {
      console.warn(
        '[TC-Sec-02] OpenSSL CLI binary not found in environment. Live socket handshake tests are genuinely skipped.'
      );
      return done();
    }

    try {
      // Generate ephemeral self-signed certificate and private key in temporary OS directory
      execSync(
        `${opensslBin} req -x509 -newkey rsa:2048 -nodes -sha256 -subj "/CN=localhost" -keyout "${tmpKeyPath}" -out "${tmpCertPath}" -days 1`,
        { stdio: 'pipe' }
      );
    } catch (err) {
      return done(
        new Error(`[TC-Sec-02] Failed to generate ephemeral test certificate with OpenSSL: ${err.message}`)
      );
    }

    try {
      // Start live HTTPS test server with TLS 1.2 hard minimum per AC-SEBM-SR-001
      const testConfig = {
        tls: {
          enabled: true,
          minVersion: 'TLSv1.2',
          certPath: tmpCertPath,
          keyPath: tmpKeyPath,
        },
      };

      httpsServer = server.createServer(app, testConfig);

      httpsServer.on('error', (err) => {
        if (!httpsPort) {
          done(new Error(`[TC-Sec-02] Failed to start HTTPS test server: ${err.message}`));
        }
      });

      httpsServer.listen(0, '127.0.0.1', () => {
        httpsPort = httpsServer.address().port;
        done();
      });
    } catch (err) {
      done(new Error(`[TC-Sec-02] Failed to initialize HTTPS test server: ${err.message}`));
    }
  });

  afterAll((done) => {
    const cleanFiles = () => {
      try {
        if (fs.existsSync(tmpKeyPath)) fs.unlinkSync(tmpKeyPath);
      } catch (e) {}
      try {
        if (fs.existsSync(tmpCertPath)) fs.unlinkSync(tmpCertPath);
      } catch (e) {}
    };

    if (httpsServer && httpsServer.listening) {
      httpsServer.close(() => {
        cleanFiles();
        done();
      });
    } else {
      cleanFiles();
      done();
    }
  });

  it('validates server configuration fails if cert or key file is missing', () => {
    expect(() => {
      server.createServer(app, {
        tls: {
          enabled: true,
          certPath: '/non/existent/cert.pem',
          keyPath: '/non/existent/key.pem',
        },
      });
    }).toThrow(/TLS_CERT_PATH file does not exist/);
  });

  it('rejects direct TLS creation with protocol version weaker than TLS 1.2 per AC-SEBM-SR-001', () => {
    expect(() => {
      server.createServer(app, {
        tls: {
          enabled: true,
          minVersion: 'TLSv1.1',
          certPath: __filename,
          keyPath: __filename,
        },
      });
    }).toThrow(/AC-SEBM-SR-001/);
  });

  itIfOpenssl('successfully completes a live TLS 1.2 client handshake and receives HTTP response', (done) => {
    let settled = false;
    let socket = null;

    const timer = setTimeout(() => {
      finish(new Error('TLS 1.2 handshake timed out'));
    }, 5000);

    const cleanup = () => {
      if (socket && !socket.destroyed) {
        socket.destroy();
      }
    };

    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      done(err);
    };

    try {
      socket = tls.connect(
        {
          host: '127.0.0.1',
          port: httpsPort,
          minVersion: 'TLSv1.2',
          maxVersion: 'TLSv1.2',
          rejectUnauthorized: false,
        },
        () => {
          try {
            const protocol = socket.getProtocol();
            expect(protocol).toBe('TLSv1.2');

            // Send HTTP GET request over encrypted socket
            socket.write('GET /health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n');
          } catch (err) {
            finish(err);
          }
        }
      );

      let responseData = '';
      socket.on('data', (chunk) => {
        responseData += chunk.toString();
      });

      socket.on('end', () => {
        try {
          expect(responseData).toContain('HTTP/1.1 200 OK');
          expect(responseData).toContain('"status":"ok"');
          finish();
        } catch (err) {
          finish(err);
        }
      });

      socket.on('error', (err) => {
        finish(err);
      });
    } catch (err) {
      finish(err);
    }
  });

  itIfOpenssl('successfully completes a live TLS 1.3 client handshake when supported', (done) => {
    let settled = false;
    let socket = null;

    const timer = setTimeout(() => {
      finish(new Error('TLS 1.3 handshake timed out'));
    }, 5000);

    const cleanup = () => {
      if (socket && !socket.destroyed) {
        socket.destroy();
      }
    };

    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      done(err);
    };

    try {
      socket = tls.connect(
        {
          host: '127.0.0.1',
          port: httpsPort,
          minVersion: 'TLSv1.3',
          maxVersion: 'TLSv1.3',
          rejectUnauthorized: false,
        },
        () => {
          try {
            const protocol = socket.getProtocol();
            expect(protocol).toBe('TLSv1.3');
            socket.end();
            finish();
          } catch (err) {
            finish(err);
          }
        }
      );

      socket.on('error', (err) => {
        finish(err);
      });
    } catch (err) {
      finish(err);
    }
  });

  itIfLegacySupported('rejects client handshakes restricted to TLS < 1.2 (AC-SEBM-SR-001)', (done) => {
    let settled = false;
    let socket = null;
    let serverTlsError = null;

    const timer = setTimeout(() => {
      finish(new Error('Legacy TLS rejection test timed out waiting for server rejection'));
    }, 5000);

    const cleanup = () => {
      if (httpsServer) {
        httpsServer.removeListener('tlsClientError', onTlsClientError);
      }
      if (socket && !socket.destroyed) {
        socket.destroy();
      }
    };

    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      done(err);
    };

    const onTlsClientError = (err) => {
      serverTlsError = err;
    };
    httpsServer.once('tlsClientError', onTlsClientError);

    try {
      socket = tls.connect(
        {
          host: '127.0.0.1',
          port: httpsPort,
          minVersion: 'TLSv1',
          maxVersion: 'TLSv1.1',
          ciphers: legacyClientInfo.ciphers,
          rejectUnauthorized: false,
        },
        () => {
          finish(new Error('Security violation: Server accepted connection on TLS < 1.2'));
        }
      );

      socket.on('error', (clientErr) => {
        // Defer to allow the server-side tlsClientError event to be processed on the event loop
        setImmediate(() => {
          try {
            // Must NOT be a client-only protocol setup abort
            expect(clientErr.code).not.toBe('ERR_SSL_NO_PROTOCOLS_AVAILABLE');

            // 1. Observable server-side evidence:
            // Node https/tls server emits tlsClientError when rejecting unsupported protocol
            expect(serverTlsError).toBeDefined();
            // Change this block in tests/integration/tlsConfig.test.js:
            expect(
              serverTlsError.code === 'ERR_SSL_UNSUPPORTED_PROTOCOL' ||
              serverTlsError.code === 'ECONNRESET' ||
              serverTlsError.code === 'ECONNREFUSED' ||
              /unsupported protocol|protocol version|handshake failure/i.test(serverTlsError.message)
            ).toBe(true);

            // 2. Observable wire evidence on client:
            // Server responds with TLS alert 70 (protocol_version alert)
            expect(
              clientErr.code === 'ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION' ||
              /alert protocol version|alert number 70|protocol version/i.test(clientErr.message)
            ).toBe(true);

            finish();
          } catch (assertionErr) {
            finish(assertionErr);
          }
        });
      });
    } catch (err) {
      finish(err);
    }
  });
});
