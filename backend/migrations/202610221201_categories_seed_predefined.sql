-- Migration: 202610221201_categories_seed_predefined.sql
-- Description: Seed predefined expense and income categories per SEBM-F-013 / SPRINT_PLAN.md
-- All predefined categories have user_id = NULL and is_custom = false.
-- Uses ON CONFLICT ON CONSTRAINT uq_categories_user_name_type DO NOTHING to ensure idempotency.

INSERT INTO categories (user_id, name, type, is_custom)
VALUES
    -- Predefined Expense Categories
    (NULL, 'Groceries', 'expense', FALSE),
    (NULL, 'Rent', 'expense', FALSE),
    (NULL, 'Utilities', 'expense', FALSE),
    (NULL, 'Transportation', 'expense', FALSE),
    (NULL, 'Healthcare', 'expense', FALSE),
    (NULL, 'Entertainment', 'expense', FALSE),
    (NULL, 'Dining Out', 'expense', FALSE),
    (NULL, 'Shopping', 'expense', FALSE),
    (NULL, 'Miscellaneous', 'expense', FALSE),

    -- Predefined Income Categories
    (NULL, 'Salary', 'income', FALSE),
    (NULL, 'Freelance', 'income', FALSE),
    (NULL, 'Investments', 'income', FALSE),
    (NULL, 'Other Income', 'income', FALSE)
ON CONFLICT ON CONSTRAINT uq_categories_user_name_type DO NOTHING;
