-- Migration: 202610221201_categories_seed_predefined.sql
-- Description: Seed predefined expense and income categories per SEBM-F-013 / SPRINT_PLAN.md
-- All predefined categories have user_id = NULL and is_custom = false.
-- Uses ON CONFLICT ON CONSTRAINT uq_categories_user_name_type DO NOTHING to ensure idempotency.

INSERT INTO categories (user_id, name, type, is_custom)
VALUES
    -- Predefined Expense Categories
    (NULL, 'Groceries', 'Expense', FALSE),
    (NULL, 'Rent', 'Expense', FALSE),
    (NULL, 'Utilities', 'Expense', FALSE),
    (NULL, 'Transportation', 'Expense', FALSE),
    (NULL, 'Healthcare', 'Expense', FALSE),
    (NULL, 'Entertainment', 'Expense', FALSE),
    (NULL, 'Dining Out', 'Expense', FALSE),
    (NULL, 'Shopping', 'Expense', FALSE),
    (NULL, 'Miscellaneous', 'Expense', FALSE),

    -- Predefined Income Categories
    (NULL, 'Salary', 'Income', FALSE),
    (NULL, 'Freelance', 'Income', FALSE),
    (NULL, 'Investments', 'Income', FALSE),
    (NULL, 'Other Income', 'Income', FALSE)
ON CONFLICT ON CONSTRAINT uq_categories_user_name_type DO NOTHING;
