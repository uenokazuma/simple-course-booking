-- 1. SEED DATA: ROLES
INSERT INTO roles (id, name) VALUES (1, 'Admin'), (2, 'Parent'), (3, 'Student');

-- 2. SEED DATA: USERS (Using securely hashed password: 123456)
INSERT INTO users (id, email, password_hash) VALUES
(1, 'admin@school.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(2, 'budi.parent@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(3, 'iwan.student@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(4, 'wati.student@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(5, 'andi.student@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(6, 'sari.parent@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(7, 'dedi.parent@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(8, 'lina.parent@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(9, 'nisa.student@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(10, 'fajar.student@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(11, 'rani.student@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(12, 'galih.student@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(13, 'maya.student@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa'),
(14, 'rio.student@email.com', '$2b$10$tiMO6f10qr8iJP9Xu2f7TuUuS73WDGFm.M1YWdqg2sKnI7iSZZ6aa');

-- 3. SEED DATA: USER_ROLES (RBAC mapping)
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1), (2, 2), (3, 3), (4, 3), (5, 3),
(6, 2), (7, 2), (8, 2),
(9, 3), (10, 3), (11, 3), (12, 3), (13, 3), (14, 3);

-- 4. SEED DATA: PARENT_PROFILES
INSERT INTO parent_profiles (id, user_id, full_name, phone_number) VALUES
(1, 2, 'Budi Sudjatmiko', '+6281234567890'),
(2, 6, 'Sari Wulandari', '+6281234567891'),
(3, 7, 'Dedi Pratama', '+6281234567892'),
(4, 8, 'Lina Maharani', '+6281234567893');

-- 5. SEED DATA: STUDENT_PROFILES (Relating children to Parent)
INSERT INTO student_profiles (id, user_id, parent_id, student_name, birth_date) VALUES
(1, 3, 1, 'Iwan Sudjatmiko', '2015-05-12'),
(2, 4, 1, 'Wati Sudjatmiko', '2018-08-23'),
(3, 5, NULL, 'Andi Wijaya', '2014-02-10'), -- Independent student profile edge-case
(4, 9, 2, 'Nisa Wulandari', '2016-03-18'),
(5, 10, 3, 'Fajar Pratama', '2013-11-07'),
(6, 11, 3, 'Rani Pratama', '2016-06-21'),
(7, 12, 3, 'Galih Pratama', '2019-01-14'),
(8, 13, 4, 'Maya Maharani', '2015-09-30'),
(9, 14, 4, 'Rio Maharani', '2018-12-05');

-- 6. SEED DATA: SYSTEM_SETTINGS
INSERT INTO system_settings (key, value, description) VALUES
('booking_lead_time_value', '1', 'Duration value for system lead time window check'),
('booking_lead_time_unit', 'DAY', 'Time unit validation variable (HOUR, DAY, WEEK)'),
('default_class_capacity', '4', 'Standard class allocation headcount'),
('max_allowed_class_capacity', '4', 'System-level restriction limit for preventing administrator allocation errors');


-- 8. SEED DATA: SUBJECTS (SGD Pricing)
INSERT INTO subjects (id, name, description, price) VALUES
(1, 'Math - Game 1', 'Introductory math games for beginners', 45.00),
(2, 'Math - Game 2', 'Level 2 problem-solving games', 50.00),
(3, 'Math - Game 3', 'Intermediate logic and numbers', 55.00),
(4, 'Math - Game 4', 'Advanced spatial reasoning', 60.00),
(5, 'Math - Game 5', 'Pre-algebra puzzle modules', 65.00),
(6, 'Math - Game 6', 'Algebraic reasoning challenges', 70.00),
(7, 'Math - Game 7', 'Master class competitive math games', 75.00);

-- 9. SEED DATA: TRIAL CLASS TEMPLATES
-- Let's create templates: Game 1 every Saturday (6), Game 2 every Sunday (0), etc.
INSERT INTO trial_class_templates (id, subject_id, day_of_week, start_time_of_day, end_time_of_day, default_max_capacity) VALUES
(1, 1, 6, '09:00:00', '10:30:00', 4), -- Math Game 1, Saturday morning
(2, 2, 0, '10:00:00', '11:30:00', 4), -- Math Game 2, Sunday morning
(3, 3, 1, '16:00:00', '17:30:00', 4), -- Math Game 3, Monday afternoon
(4, 4, 2, '16:00:00', '17:30:00', 4), -- Math Game 4, Tuesday afternoon
(5, 5, 3, '16:00:00', '17:30:00', 4), -- Math Game 5, Wednesday afternoon
(6, 6, 4, '16:00:00', '17:30:00', 4), -- Math Game 6, Thursday afternoon
(7, 7, 5, '16:00:00', '17:30:00', 4); -- Math Game 7, Friday afternoon

-- 10. SEED DATA: TRIAL CLASSES (Simulated generation for October 2026)
-- Oct 3, 2026 is a Saturday
INSERT INTO trial_classes (id, template_id, subject_id, start_time, end_time, max_capacity, current_booked) VALUES
(1, 1, 1, '2026-10-03 09:00:00+08', '2026-10-03 10:30:00+08', 4, 1),
(2, 2, 2, '2026-10-04 10:00:00+08', '2026-10-04 11:30:00+08', 4, 1),
(3, 3, 3, '2026-10-05 16:00:00+08', '2026-10-05 17:30:00+08', 4, 1),
(4, 4, 4, '2026-10-06 16:00:00+08', '2026-10-06 17:30:00+08', 4, 1),
(5, 5, 5, '2026-10-07 16:00:00+08', '2026-10-07 17:30:00+08', 4, 1);

-- 11. SEED DATA: BOOKINGS (Pre-populate transactional data to match historical schedule counts)
INSERT INTO bookings (id, student_id, trial_classes_id, status) VALUES
(1, 1, 1, 'CONFIRMED'),
(2, 2, 1, 'CONFIRMED'),
(3, 1, 3, 'CONFIRMED'),
(4, 2, 3, 'CONFIRMED'),
(5, 3, 3, 'CONFIRMED');

-- 12. SYNC SEQUENCES: Update sequence primary key trackers
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('parent_profiles_id_seq', (SELECT MAX(id) FROM parent_profiles));
SELECT setval('student_profiles_id_seq', (SELECT MAX(id) FROM student_profiles));
SELECT setval('subjects_id_seq', (SELECT MAX(id) FROM subjects));
SELECT setval('trial_class_templates_id_seq', (SELECT MAX(id) FROM trial_class_templates));
SELECT setval('trial_classes_id_seq', (SELECT MAX(id) FROM trial_classes));
SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));
SELECT setval('payment_attempts_id_seq', (SELECT MAX(id) FROM payment_attempts));