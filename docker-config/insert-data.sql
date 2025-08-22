-- Umetanje podataka u routes tablicu (jedna po jedna)
INSERT INTO routes VALUES (1, 'Zagreb', 'Split', 380, 240, 35.00);
INSERT INTO routes VALUES (2, 'Zagreb', 'Rijeka', 165, 120, 25.00);
INSERT INTO routes VALUES (3, 'Split', 'Dubrovnik', 230, 180, 30.00);
INSERT INTO routes VALUES (4, 'Zagreb', 'Osijek', 280, 210, 28.00);
INSERT INTO routes VALUES (5, 'Rijeka', 'Pula', 105, 90, 20.00);

-- Umetanje podataka u buses tablicu
INSERT INTO buses VALUES (1, 'ZG-001-AA', 50, 'Mercedes Tourismo');
INSERT INTO buses VALUES (2, 'ZG-002-BB', 45, 'Volvo 9700');
INSERT INTO buses VALUES (3, 'ST-001-CC', 52, 'MAN Lion''s Coach');
INSERT INTO buses VALUES (4, 'RI-001-DD', 48, 'Setra S416');

-- Umetanje podataka u schedules tablicu
INSERT INTO schedules VALUES (12, 2, 1, '2025-08-23 08:00:00', '2025-08-23 12:00:00', 50, 'ACTIVE');
INSERT INTO schedules VALUES (20, 1, 2, '2025-08-23 14:00:00', '2025-08-23 18:00:00', 45, 'ACTIVE');
INSERT INTO schedules VALUES (30, 2, 3, '2025-08-23 09:30:00', '2025-08-23 11:30:00', 52, 'ACTIVE');
INSERT INTO schedules VALUES (40, 3, 4, '2025-08-23 16:00:00', '2025-08-23 19:00:00', 48, 'ACTIVE');
INSERT INTO schedules VALUES (50, 1, 1, '2025-08-23 08:00:00', '2025-08-23 12:00:00', 50, 'ACTIVE');
INSERT INTO schedules VALUES (60, 2, 2, '2025-08-23 10:00:00', '2025-08-23 12:00:00', 45, 'ACTIVE');
INSERT INTO schedules VALUES (70, 1, 3, '2025-08-23 07:30:00', '2025-08-23 11:30:00', 50, 'ACTIVE');
INSERT INTO schedules VALUES (80, 3, 1, '2025-08-23 15:00:00', '2025-08-23 18:00:00', 52, 'ACTIVE');
INSERT INTO schedules VALUES (90, 2, 4, '2025-08-22 09:00:00', '2025-08-22 11:00:00', 45, 'ACTIVE');
INSERT INTO schedules VALUES (11, 4, 2, '2025-08-22 13:30:00', '2025-08-22 16:30:00', 48, 'ACTIVE');