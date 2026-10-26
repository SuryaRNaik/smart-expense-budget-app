INSERT INTO categories (category_id, user_id, name, type, is_custom)
VALUES 
    (gen_random_uuid()::text, NULL, 'Groceries', 'expense', FALSE),
    (gen_random_uuid()::text, NULL, 'Utilities', 'expense', FALSE),
    (gen_random_uuid()::text, NULL, 'Rent', 'expense', FALSE),
    (gen_random_uuid()::text, NULL, 'Dining', 'expense', FALSE),
    (gen_random_uuid()::text, NULL, 'Transport', 'expense', FALSE),
    (gen_random_uuid()::text, NULL, 'Salary', 'income', FALSE),
    (gen_random_uuid()::text, NULL, 'Freelance', 'income', FALSE),
    (gen_random_uuid()::text, NULL, 'Investments', 'income', FALSE)
ON CONFLICT ON CONSTRAINT uq_categories_user_name_type DO NOTHING;