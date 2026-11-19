-- The site's core tables, STRUCTURE ONLY. No data, and no DROP statements.
--
-- WHY THIS EXISTS
--   Continuous integration needs to create the site's tables on a real MySQL
--   8.4 -- the version the server runs -- so that a query written against the
--   newer MySQL on a laptop cannot reach production untested. Before this
--   file, the shape of these tables existed in exactly one place: the server.
--
--   It is NOT a backup. Artwork, projects, orders and the newsletter list live
--   only in production and in Ambar's own originals.
--
-- NEVER RUN THIS AGAINST PRODUCTION. The tables are already there; this would
-- fail on every one of them, which is the safe outcome, but there is no reason
-- to point it at a live database. A real schema change goes in its own .sql
-- file, like database/shop.sql, written to add rather than replace.
--
-- The shop's tables are not here -- database/shop.sql creates those, and
-- having two files that both define them would be two things to keep in step.
-- shopItems is the exception: it is the old unused Shopify-embed table, which
-- shop.sql deliberately leaves alone, so it is captured here with the rest.
--
-- TO REGENERATE, from a laptop whose practice database has been refreshed:
--
--   mysqldump --no-data --no-tablespaces --skip-add-drop-table \
--     --skip-comments --set-gtid-purged=OFF --single-transaction \
--     ambar_site_local aboutMe admin_last_visit allWorks login_attempts \
--     navLinks newsletterEmailList projects shopItems users worksInProjects
--
-- Captured from production's own schema, 2026-11-16 (MySQL 8.4.13 on the
-- server; the dump was taken through the practice copy).


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aboutMe` (
  `description` text,
  `pictureLocation` varchar(255) DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=116 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_last_visit` (
  `section` varchar(50) NOT NULL,
  `last_visit` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`section`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `allWorks` (
  `workId` int NOT NULL AUTO_INCREMENT,
  `fileLocation` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `desc2` text,
  `desc3` varchar(255) DEFAULT NULL,
  `medium` varchar(255) DEFAULT NULL,
  `color` tinyint(1) DEFAULT NULL,
  `isAvailable` int DEFAULT NULL,
  `year` int DEFAULT NULL,
  `visible` int DEFAULT '1',
  `orderOfDisplay` int DEFAULT NULL,
  `carousel` int DEFAULT '0',
  `isSelectWork` int DEFAULT '0',
  `relatedProject` int DEFAULT NULL,
  `long_description` text,
  PRIMARY KEY (`workId`),
  KEY `relatedProject` (`relatedProject`),
  CONSTRAINT `allWorks_ibfk_1` FOREIGN KEY (`relatedProject`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=346 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ip_address` varchar(45) DEFAULT NULL,
  `attempt_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `attempts` int DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `navLinks` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `displayedText` varchar(255) DEFAULT NULL,
  `linkRedirection` varchar(255) DEFAULT NULL,
  `displayedOrder` int DEFAULT NULL,
  `isChangeable` tinyint DEFAULT '1',
  `onclick` varchar(255) DEFAULT NULL,
  `isNewTab` tinyint DEFAULT '1',
  `attachedFollowingDiv` varchar(255) DEFAULT '',
  `visible` int DEFAULT '1',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `newsletterEmailList` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subscriptionDate` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `active` int DEFAULT NULL,
  `description` text,
  `title` varchar(255) DEFAULT NULL,
  `orderOfDisplay` int DEFAULT '0',
  `deleted` int DEFAULT '0',
  `isCurrentProject` tinyint DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shopItems` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `productOrder` int DEFAULT NULL,
  `available` int DEFAULT NULL,
  `buttonCode` text,
  `visible` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `worksInProjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workId` int DEFAULT NULL,
  `projectId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `workId` (`workId`),
  KEY `projectId` (`projectId`),
  CONSTRAINT `worksInProjects_ibfk_1` FOREIGN KEY (`workId`) REFERENCES `allWorks` (`workId`),
  CONSTRAINT `worksInProjects_ibfk_2` FOREIGN KEY (`projectId`) REFERENCES `projects` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3546 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

