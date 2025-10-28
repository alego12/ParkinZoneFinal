-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: localhost    Database: parking_zone_db
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Temporary view structure for view `daily_revenue`
--

DROP TABLE IF EXISTS `daily_revenue`;
/*!50001 DROP VIEW IF EXISTS `daily_revenue`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `daily_revenue` AS SELECT 
 1 AS `date`,
 1 AS `total_reservations`,
 1 AS `total_revenue`,
 1 AS `average_amount`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `lpr_records`
--

DROP TABLE IF EXISTS `lpr_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lpr_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plateNumber` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `vehicleColor` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detectedAt` timestamp NOT NULL,
  `imagePath` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `confidence` float DEFAULT '0',
  `status` enum('pending','matched','no_match','processed','vehicle_created') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `reservationId` int DEFAULT NULL,
  `vehicleId` int DEFAULT NULL,
  `userId` int DEFAULT NULL,
  `processedBy` int DEFAULT NULL,
  `processedAt` timestamp NULL DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `reservationId` (`reservationId`),
  KEY `vehicleId` (`vehicleId`),
  KEY `userId` (`userId`),
  KEY `processedBy` (`processedBy`),
  KEY `idx_lpr_records_detectedAt` (`detectedAt`),
  KEY `idx_lpr_records_status` (`status`),
  KEY `idx_lpr_records_plateNumber` (`plateNumber`),
  CONSTRAINT `lpr_records_ibfk_1` FOREIGN KEY (`reservationId`) REFERENCES `reservations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lpr_records_ibfk_2` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lpr_records_ibfk_3` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `lpr_records_ibfk_4` FOREIGN KEY (`processedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lpr_records`
--

LOCK TABLES `lpr_records` WRITE;
/*!40000 ALTER TABLE `lpr_records` DISABLE KEYS */;
INSERT INTO `lpr_records` VALUES (1,'1234FBK','Plateado','2025-10-28 02:09:45','manual-entry',1,'matched',1,1,27,25,'2025-10-28 02:09:46','Entrada manual (reserva existente)','2025-10-28 02:09:45','2025-10-28 02:09:46'),(2,'4567APS','Negro','2025-10-28 02:13:02','manual-entry',1,'processed',2,2,29,NULL,NULL,'Entrada manual por seguridad/admin - usuario y vehículo nuevos','2025-10-28 02:13:02','2025-10-28 02:13:02'),(3,'1234QWE','Rojo','2025-10-28 02:27:37','manual-entry',1,'processed',5,3,30,NULL,NULL,'Entrada manual por seguridad/admin','2025-10-28 02:27:37','2025-10-28 02:27:37');
/*!40000 ALTER TABLE `lpr_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `parking_occupancy`
--

DROP TABLE IF EXISTS `parking_occupancy`;
/*!50001 DROP VIEW IF EXISTS `parking_occupancy`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `parking_occupancy` AS SELECT 
 1 AS `zone`,
 1 AS `total_spaces`,
 1 AS `available_spaces`,
 1 AS `occupied_spaces`,
 1 AS `maintenance_spaces`,
 1 AS `reserved_spaces`,
 1 AS `occupancy_rate`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `parking_spaces`
--

DROP TABLE IF EXISTS `parking_spaces`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking_spaces` (
  `id` int NOT NULL AUTO_INCREMENT,
  `spaceNumber` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `zone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('available','occupied','maintenance','reserved') COLLATE utf8mb4_unicode_ci DEFAULT 'available',
  `positionX` float NOT NULL,
  `positionY` float NOT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `vehicleType` enum('car','motorcycle','both') COLLATE utf8mb4_unicode_ci DEFAULT 'both',
  `scheduleId` int NOT NULL DEFAULT '1',
  `carRate` decimal(10,2) DEFAULT '2.50',
  `motorcycleRate` decimal(10,2) DEFAULT '1.50',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `spaceNumber` (`spaceNumber`),
  KEY `scheduleId` (`scheduleId`),
  KEY `idx_parking_spaces_status` (`status`),
  KEY `idx_parking_spaces_zone` (`zone`),
  CONSTRAINT `parking_spaces_ibfk_1` FOREIGN KEY (`scheduleId`) REFERENCES `schedules` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parking_spaces`
--

LOCK TABLES `parking_spaces` WRITE;
/*!40000 ALTER TABLE `parking_spaces` DISABLE KEYS */;
INSERT INTO `parking_spaces` VALUES (1,'A1','Zona A','occupied',1,1,1,'car',1,3.00,2.00,'2025-10-16 20:04:15','2025-10-28 02:13:02'),(2,'A2','Zona A','occupied',2,1,1,'car',1,3.00,2.00,'2025-10-16 20:04:15','2025-10-28 02:09:45'),(3,'A3','Zona A','available',3,1,1,'car',1,3.00,2.00,'2025-10-16 20:04:15','2025-10-28 02:30:29'),(4,'A4','Zona A','available',4,1,1,'car',1,3.00,2.00,'2025-10-16 20:04:15','2025-10-28 02:30:03'),(5,'A5','Zona A','available',5,1,1,'car',1,3.00,2.00,'2025-10-16 20:04:15','2025-10-28 00:46:19'),(6,'A6','Zona A','available',6,1,1,'car',1,3.00,2.00,'2025-10-16 20:04:15','2025-10-28 02:08:18'),(7,'A7','Zona A','maintenance',7,1,1,'car',1,3.00,2.00,'2025-10-16 20:04:15','2025-10-28 00:42:48'),(8,'A8','Zona A','maintenance',8,1,1,'car',1,3.00,2.00,'2025-10-16 20:04:15','2025-10-28 00:39:06'),(9,'B1','Zona B','maintenance',1,2,1,'motorcycle',1,2.50,1.50,'2025-10-16 20:04:15','2025-10-28 00:34:41'),(10,'B2','Zona B','available',2,2,1,'motorcycle',1,2.50,1.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(11,'B3','Zona B','available',3,2,1,'motorcycle',1,2.50,1.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(12,'B4','Zona B','available',4,2,1,'motorcycle',1,2.50,1.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(13,'B5','Zona B','available',5,2,1,'motorcycle',1,2.50,1.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(14,'B6','Zona B','available',6,2,1,'motorcycle',1,2.50,1.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(15,'B7','Zona B','available',7,2,1,'motorcycle',1,2.50,1.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(16,'B8','Zona B','available',8,2,1,'motorcycle',1,2.50,1.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(17,'C1','Zona C','available',1,3,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(18,'C2','Zona C','available',2,3,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(19,'C3','Zona C','available',3,3,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(20,'C4','Zona C','available',4,3,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(21,'C5','Zona C','available',5,3,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(22,'C6','Zona C','available',6,3,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(23,'C7','Zona C','maintenance',7,3,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-27 23:54:34'),(24,'C8','Zona C','available',8,3,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(25,'D1','Zona D','available',1,4,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(26,'D2','Zona D','available',2,4,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(27,'D3','Zona D','available',3,4,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(28,'D4','Zona D','available',4,4,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(29,'D5','Zona D','available',5,4,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(30,'D6','Zona D','available',6,4,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(31,'D7','Zona D','available',7,4,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(32,'D8','Zona D','available',8,4,1,'both',1,3.50,2.50,'2025-10-16 20:04:15','2025-10-16 20:04:15');
/*!40000 ALTER TABLE `parking_spaces` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_resets`
--

DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `code` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` datetime NOT NULL,
  `usedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_code` (`userId`,`code`),
  KEY `idx_expires` (`expiresAt`),
  CONSTRAINT `fk_password_resets_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_resets`
--

LOCK TABLES `password_resets` WRITE;
/*!40000 ALTER TABLE `password_resets` DISABLE KEYS */;
INSERT INTO `password_resets` VALUES (1,25,'881903','2025-10-27 21:36:28',NULL,'2025-10-28 01:21:28','2025-10-28 01:21:28'),(2,26,'254308','2025-10-27 21:37:55',NULL,'2025-10-28 01:22:55','2025-10-28 01:22:55'),(3,26,'561550','2025-10-28 01:42:08','2025-10-28 01:28:16','2025-10-28 01:27:08','2025-10-28 01:28:16'),(4,26,'264809','2025-10-28 02:50:51','2025-10-28 02:36:29','2025-10-28 02:35:51','2025-10-28 02:36:29');
/*!40000 ALTER TABLE `password_resets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reservations`
--

DROP TABLE IF EXISTS `reservations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `vehicleId` int NOT NULL,
  `parkingSpaceId` int NOT NULL,
  `startTime` timestamp NOT NULL,
  `endTime` datetime DEFAULT NULL,
  `status` enum('active','occupied','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `totalAmount` decimal(10,2) DEFAULT '0.00',
  `paymentStatus` enum('pending','paid','refunded') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `vehicleId` (`vehicleId`),
  KEY `parkingSpaceId` (`parkingSpaceId`),
  KEY `idx_reservations_userId` (`userId`),
  KEY `idx_reservations_status` (`status`),
  KEY `idx_reservations_startTime` (`startTime`),
  CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reservations_ibfk_2` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reservations_ibfk_3` FOREIGN KEY (`parkingSpaceId`) REFERENCES `parking_spaces` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reservations`
--

LOCK TABLES `reservations` WRITE;
/*!40000 ALTER TABLE `reservations` DISABLE KEYS */;
INSERT INTO `reservations` VALUES (1,27,1,2,'2025-10-28 05:28:00',NULL,'occupied',0.00,'pending','2025-10-28 01:29:32','2025-10-28 02:09:45'),(2,29,2,1,'2025-10-28 02:13:02',NULL,'active',0.00,'pending','2025-10-28 02:13:02','2025-10-28 02:13:02'),(3,30,3,3,'2025-10-28 06:17:00',NULL,'completed',0.00,'paid','2025-10-28 02:19:28','2025-10-28 02:20:49'),(4,30,3,3,'2025-10-27 15:00:00','2025-10-27 15:59:00','completed',2.95,'paid','2025-10-28 02:24:55','2025-10-28 02:30:29'),(5,30,3,4,'2025-10-28 02:27:37','2025-10-28 02:30:03','completed',3.00,'pending','2025-10-28 02:27:37','2025-10-28 02:30:03');
/*!40000 ALTER TABLE `reservations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedules`
--

DROP TABLE IF EXISTS `schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `dayOfWeek` tinyint NOT NULL,
  `startTime` time NOT NULL,
  `endTime` time NOT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  `overtimeRate` decimal(10,2) DEFAULT '2.00',
  `indefiniteRate` decimal(10,2) DEFAULT '5.00',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_schedules_dayOfWeek` (`dayOfWeek`),
  KEY `idx_schedules_isActive` (`isActive`),
  CONSTRAINT `schedules_chk_1` CHECK (((`dayOfWeek` >= 0) and (`dayOfWeek` <= 6)))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedules`
--

LOCK TABLES `schedules` WRITE;
/*!40000 ALTER TABLE `schedules` DISABLE KEYS */;
INSERT INTO `schedules` VALUES (1,'Lunes a Viernes','Horario de lunes a viernes',1,'08:00:00','18:00:00',1,2.00,5.00,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(2,'Lunes a Viernes','Horario de lunes a viernes',2,'08:00:00','18:00:00',1,2.00,5.00,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(3,'Lunes a Viernes','Horario de lunes a viernes',3,'08:00:00','18:00:00',1,2.00,5.00,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(4,'Lunes a Viernes','Horario de lunes a viernes',4,'08:00:00','18:00:00',1,2.00,5.00,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(5,'Lunes a Viernes','Horario de lunes a viernes',5,'08:00:00','18:00:00',1,2.00,5.00,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(6,'Fin de Semana','Horario de fin de semana',6,'09:00:00','17:00:00',1,3.00,7.00,'2025-10-16 20:04:15','2025-10-16 20:04:15'),(7,'Fin de Semana','Horario de fin de semana',0,'09:00:00','17:00:00',1,3.00,7.00,'2025-10-16 20:04:15','2025-10-16 20:04:15');
/*!40000 ALTER TABLE `schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `firstName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `lastName` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','security','client','cashier') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'client',
  `isActive` tinyint(1) DEFAULT '1',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (25,'admin@test.com','$2a$12$qqJI5elEgWx5S0fVlw/k8Ode7l/XfMUpjXeaZmBZ.hw8MRNCCX39O','Admin','Principal','+591-70000000','admin',1,'2025-10-28 01:10:39','2025-10-28 01:10:39'),(26,'jg012119@gmail.com','$2a$12$z/m8flQL8nfUDQu1pd2DRO8Zf2zGRP/9oVtJT1N2atpoTFYXRFOTO','Jairo','Guzman','76196896','cashier',1,'2025-10-28 01:22:40','2025-10-28 02:36:29'),(27,'jgr012119@gmail.com','$2a$12$Qr7CCuA3xMvQr41jVZtkHebwmWRL7jDcLJlcizfhYNlm9FD6ojzUO','Oso12','Balderrama','11223344','client',1,'2025-10-28 01:29:32','2025-10-28 02:07:46'),(28,'alexandroarandia12@gmail.com','$2a$12$M6E9SMbJeA/9cyl04YGTg.jnodw4LDOi5XXrT1ASgG7XE1F0ucEau','Alexander','Arandia','12345678','security',1,'2025-10-28 02:07:31','2025-10-28 02:07:31'),(29,'quivobolivia@gmail.com','$2a$12$rTbxXBIg0V7lzuMEj6Mdyu/S6oiw8Jpa0z4W5bw7VXzuWQuOrVS/m','Juan','Perez','12457896','client',1,'2025-10-28 02:12:58','2025-10-28 02:12:58'),(30,'j73227703@gmail.com','$2a$12$fVJGeK.F7tZUynf.O/uh6.iDS6rtwXHhNgz9uJsR3p5pC9it25Wbe','Prueba','uno','45968745','client',1,'2025-10-28 02:19:28','2025-10-28 02:19:28');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `model` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plate` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('car','motorcycle') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'car',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plate` (`plate`),
  KEY `idx_vehicles_userId` (`userId`),
  KEY `idx_vehicles_plate` (`plate`),
  CONSTRAINT `vehicles_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicles`
--

LOCK TABLES `vehicles` WRITE;
/*!40000 ALTER TABLE `vehicles` DISABLE KEYS */;
INSERT INTO `vehicles` VALUES (1,27,'Toyota','1234FBK','Plateado','car','2025-10-28 01:29:32','2025-10-28 01:29:32'),(2,29,'Toyota Condor','4567APS','Negro','car','2025-10-28 02:13:01','2025-10-28 02:13:01'),(3,30,'Nissan','1234QWE','Rojo','car','2025-10-28 02:19:28','2025-10-28 02:19:28');
/*!40000 ALTER TABLE `vehicles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Final view structure for view `daily_revenue`
--

/*!50001 DROP VIEW IF EXISTS `daily_revenue`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `daily_revenue` AS select cast(`reservations`.`createdAt` as date) AS `date`,count(0) AS `total_reservations`,sum(`reservations`.`totalAmount`) AS `total_revenue`,avg(`reservations`.`totalAmount`) AS `average_amount` from `reservations` where (`reservations`.`status` = 'completed') group by cast(`reservations`.`createdAt` as date) order by `date` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `parking_occupancy`
--

/*!50001 DROP VIEW IF EXISTS `parking_occupancy`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `parking_occupancy` AS select `parking_spaces`.`zone` AS `zone`,count(0) AS `total_spaces`,sum((case when (`parking_spaces`.`status` = 'available') then 1 else 0 end)) AS `available_spaces`,sum((case when (`parking_spaces`.`status` = 'occupied') then 1 else 0 end)) AS `occupied_spaces`,sum((case when (`parking_spaces`.`status` = 'maintenance') then 1 else 0 end)) AS `maintenance_spaces`,sum((case when (`parking_spaces`.`status` = 'reserved') then 1 else 0 end)) AS `reserved_spaces`,round(((sum((case when (`parking_spaces`.`status` = 'occupied') then 1 else 0 end)) / count(0)) * 100),2) AS `occupancy_rate` from `parking_spaces` where (`parking_spaces`.`isActive` = true) group by `parking_spaces`.`zone` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-27 22:40:09
