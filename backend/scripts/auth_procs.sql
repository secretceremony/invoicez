-- Auth schema & stored procedures (run as root/DBA)
-- Assumes database invoicez_db is selected

USE invoicez_db;

-- Users table (idempotent)
CREATE TABLE IF NOT EXISTS Users (
  UserID BIGINT AUTO_INCREMENT PRIMARY KEY,
  Email VARCHAR(255) NOT NULL UNIQUE,
  FullName VARCHAR(255),
  PasswordHash VARCHAR(255) NOT NULL,
  PasswordSalt VARCHAR(255) NOT NULL,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP PROCEDURE IF EXISTS CreateUserTx;
DROP PROCEDURE IF EXISTS GetUserByEmailTx;
DROP PROCEDURE IF EXISTS DeleteUserByEmailTx;

DELIMITER //

CREATE DEFINER=`root`@`%` PROCEDURE CreateUserTx(
  IN p_Email VARCHAR(255),
  IN p_FullName VARCHAR(255),
  IN p_PasswordHash VARCHAR(255),
  IN p_PasswordSalt VARCHAR(255)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
    INSERT INTO Users (Email, FullName, PasswordHash, PasswordSalt)
    VALUES (p_Email, p_FullName, p_PasswordHash, p_PasswordSalt);

    SELECT UserID, Email, FullName
    FROM Users
    WHERE UserID = LAST_INSERT_ID();
  COMMIT;
END//

CREATE DEFINER=`root`@`%` PROCEDURE GetUserByEmailTx(
  IN p_Email VARCHAR(255)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
    SELECT UserID, Email, FullName, PasswordHash, PasswordSalt
    FROM Users
    WHERE Email = p_Email
    LIMIT 1;
  COMMIT;
END//

CREATE DEFINER=`root`@`%` PROCEDURE DeleteUserByEmailTx(
  IN p_Email VARCHAR(255)
)
SQL SECURITY DEFINER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
    DELETE FROM Users WHERE Email = p_Email;
    SELECT ROW_COUNT() AS affected;
  COMMIT;
END//

DELIMITER ;

-- Optional: grant execute to app user (run as admin)
-- GRANT EXECUTE ON PROCEDURE invoicez_db.CreateUserTx TO 'resolver'@'localhost';
-- GRANT EXECUTE ON PROCEDURE invoicez_db.GetUserByEmailTx TO 'resolver'@'localhost';
-- GRANT EXECUTE ON PROCEDURE invoicez_db.DeleteUserByEmailTx TO 'resolver'@'localhost';
-- FLUSH PRIVILEGES;
