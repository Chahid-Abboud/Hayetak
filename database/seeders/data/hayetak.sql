-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Sep 17, 2025 at 05:20 AM
-- Server version: 9.1.0
-- PHP Version: 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hayetak`
--

-- --------------------------------------------------------

--
-- Table structure for table `cache`
--

DROP TABLE IF EXISTS `cache`;
CREATE TABLE IF NOT EXISTS `cache` (
  `key` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cache_locks`
--

DROP TABLE IF EXISTS `cache_locks`;
CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `diets`
--

DROP TABLE IF EXISTS `diets`;
CREATE TABLE IF NOT EXISTS `diets` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'My Diet',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `diets_user_id_foreign` (`user_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `diets`
--

INSERT INTO `diets` (`id`, `user_id`, `name`, `created_at`, `updated_at`) VALUES
(1, 3, 'test ing', '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(2, 3, 'test ing', '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(3, 3, 'test ing', '2025-09-14 12:21:27', '2025-09-14 12:21:27');

-- --------------------------------------------------------

--
-- Table structure for table `diet_items`
--

DROP TABLE IF EXISTS `diet_items`;
CREATE TABLE IF NOT EXISTS `diet_items` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `diet_id` bigint UNSIGNED NOT NULL,
  `category` enum('breakfast','lunch','dinner','snack','drink') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_portion` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `calories` int UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `diet_items_diet_id_foreign` (`diet_id`)
) ENGINE=MyISAM AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `diet_items`
--

INSERT INTO `diet_items` (`id`, `diet_id`, `category`, `label`, `default_portion`, `calories`, `created_at`, `updated_at`) VALUES
(1, 1, 'breakfast', 'oatmeal', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(2, 1, 'breakfast', 'milk & cornflakes', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(3, 1, 'breakfast', 'mankoushe', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(4, 1, 'breakfast', 'jebne sandwich', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(5, 1, 'breakfast', 'labne sandwich', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(6, 1, 'lunch', 'Taouk sandwich', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(7, 1, 'lunch', 'rice & Chicken', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(8, 1, 'lunch', 'fried chicken', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(9, 1, 'lunch', 'hamburger', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(10, 1, 'lunch', 'fries', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(11, 1, 'lunch', 'fajita sandwich', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(12, 1, 'snack', 'oreo', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(13, 1, 'snack', 'choco prince', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(14, 1, 'snack', 'cookie', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(15, 1, 'drink', 'spanish latte', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(16, 1, 'drink', 'americano', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(17, 1, 'drink', 'Mocha', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(18, 1, 'dinner', 'steak & frites', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(19, 1, 'dinner', 'shawarma platter', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(20, 1, 'dinner', 'shawarma sandwich', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(21, 1, 'dinner', 'lahm b aajin', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(22, 1, 'dinner', 'open wings', NULL, NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(23, 2, 'breakfast', 'oatmeal', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(24, 2, 'breakfast', 'milk & cornflakes', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(25, 2, 'breakfast', 'mankoushe', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(26, 2, 'breakfast', 'jebne sandwich', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(27, 2, 'breakfast', 'labne sandwich', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(28, 2, 'lunch', 'Taouk sandwich', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(29, 2, 'lunch', 'rice & Chicken', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(30, 2, 'lunch', 'fried chicken', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(31, 2, 'lunch', 'hamburger', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(32, 2, 'lunch', 'fries', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(33, 2, 'lunch', 'fajita sandwich', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(34, 2, 'snack', 'oreo', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(35, 2, 'snack', 'choco prince', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(36, 2, 'snack', 'cookie', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(37, 2, 'drink', 'spanish latte', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(38, 2, 'drink', 'americano', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(39, 2, 'drink', 'Mocha', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(40, 2, 'dinner', 'steak & frites', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(41, 2, 'dinner', 'shawarma platter', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(42, 2, 'dinner', 'shawarma sandwich', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(43, 2, 'dinner', 'lahm b aajin', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(44, 2, 'dinner', 'open wings', NULL, NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(45, 3, 'breakfast', 'oatmeal', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(46, 3, 'breakfast', 'milk & cornflakes', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(47, 3, 'breakfast', 'mankoushe', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(48, 3, 'breakfast', 'jebne sandwich', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(49, 3, 'breakfast', 'labne sandwich', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(50, 3, 'lunch', 'Taouk sandwich', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(51, 3, 'lunch', 'rice & Chicken', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(52, 3, 'lunch', 'fried chicken', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(53, 3, 'lunch', 'hamburger', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(54, 3, 'lunch', 'fries', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(55, 3, 'lunch', 'fajita sandwich', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(56, 3, 'snack', 'oreo', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(57, 3, 'snack', 'choco prince', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(58, 3, 'snack', 'cookie', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(59, 3, 'drink', 'spanish latte', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(60, 3, 'drink', 'americano', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(61, 3, 'drink', 'Mocha', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(62, 3, 'dinner', 'steak & frites', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(63, 3, 'dinner', 'shawarma platter', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(64, 3, 'dinner', 'shawarma sandwich', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(65, 3, 'dinner', 'lahm b aajin', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(66, 3, 'dinner', 'open wings', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27'),
(67, 3, 'snack', 'brownie', NULL, NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27');

-- --------------------------------------------------------

--
-- Table structure for table `exercises`
--

DROP TABLE IF EXISTS `exercises`;
CREATE TABLE IF NOT EXISTS `exercises` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `primary_muscle` enum('chest','back','shoulders','legs','glutes','biceps','triceps','core','calves') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `equipment` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exercises_name_unique` (`name`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

DROP TABLE IF EXISTS `failed_jobs`;
CREATE TABLE IF NOT EXISTS `failed_jobs` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `foods`
--

DROP TABLE IF EXISTS `foods`;
CREATE TABLE IF NOT EXISTS `foods` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('breakfast','lunch','dinner','snack','drink') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `serving_size` decimal(8,2) NOT NULL,
  `serving_unit` enum('g','ml') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `calories_kcal` decimal(8,1) NOT NULL,
  `protein_g` decimal(8,1) NOT NULL,
  `carbs_g` decimal(8,1) NOT NULL,
  `fat_g` decimal(8,1) NOT NULL,
  `fiber_g` decimal(8,1) DEFAULT NULL,
  `sugar_g` decimal(8,1) DEFAULT NULL,
  `sodium_mg` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_food` (`name`,`category`,`serving_size`,`serving_unit`)
) ENGINE=InnoDB AUTO_INCREMENT=686 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `foods`
--

INSERT INTO `foods` (`id`, `name`, `category`, `serving_size`, `serving_unit`, `calories_kcal`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `sugar_g`, `sodium_mg`, `created_at`, `updated_at`) VALUES
(1, 'Manakish Zaatar (saj)', 'breakfast', 120.00, 'g', 350.0, 9.0, 50.0, 12.0, 4.0, 2.0, 600, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(2, 'Manakish Cheese (akkawi)', 'breakfast', 130.00, 'g', 400.0, 14.0, 43.0, 17.0, 3.0, 3.0, 800, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(3, 'Manakish Lahm bi Ajin', 'breakfast', 130.00, 'g', 380.0, 16.0, 41.0, 16.0, 2.0, 3.0, 650, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(4, 'Saj Wrap Labneh & Zaatar', 'breakfast', 160.00, 'g', 420.0, 14.0, 49.0, 18.0, 3.0, 5.0, 850, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(5, 'Saj Wrap Cheese & Tomato', 'breakfast', 160.00, 'g', 440.0, 18.0, 44.0, 19.0, 3.0, 5.0, 900, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(6, 'Kaak with Zaatar', 'breakfast', 140.00, 'g', 410.0, 12.0, 61.0, 12.0, 4.0, 4.0, 750, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(7, 'Labneh (full-fat) with Olive Oil', 'breakfast', 120.00, 'g', 250.0, 10.0, 8.0, 19.0, 0.0, 7.0, 350, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(8, 'Labneh (low-fat) with Cucumber', 'breakfast', 120.00, 'g', 170.0, 12.0, 9.0, 8.0, 0.0, 7.0, 350, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(9, 'Foul Mdammas (fava beans)', 'breakfast', 180.00, 'g', 210.0, 13.0, 28.0, 5.0, 10.0, 2.0, 460, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(10, 'Balila (chickpeas)', 'breakfast', 180.00, 'g', 295.0, 14.0, 45.0, 6.0, 12.0, 4.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(11, 'Msabbaha (warm hummus)', 'breakfast', 180.00, 'g', 310.0, 12.0, 36.0, 12.0, 8.0, 2.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(12, 'Hummus Plate (olive oil)', 'breakfast', 150.00, 'g', 250.0, 11.0, 20.0, 13.0, 6.0, 1.0, 480, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(13, 'Falafel Sandwich (pita)', 'breakfast', 200.00, 'g', 520.0, 18.0, 62.0, 22.0, 11.0, 5.0, 980, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(14, 'Boiled Eggs (2)', 'breakfast', 100.00, 'g', 155.0, 13.0, 1.0, 11.0, 0.0, 1.0, 140, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(15, 'Fried Eggs in Olive Oil (2)', 'breakfast', 120.00, 'g', 240.0, 14.0, 1.0, 20.0, 0.0, 1.0, 220, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(16, 'Scrambled Eggs with Tomato', 'breakfast', 180.00, 'g', 260.0, 17.0, 7.0, 18.0, 2.0, 5.0, 380, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(17, 'Ijjeh (herb omelette)', 'breakfast', 150.00, 'g', 280.0, 16.0, 12.0, 18.0, 2.0, 3.0, 420, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(18, 'Shakshouka', 'breakfast', 220.00, 'g', 240.0, 13.0, 14.0, 15.0, 4.0, 9.0, 600, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(19, 'Akkawi Cheese Slices', 'breakfast', 60.00, 'g', 180.0, 12.0, 1.0, 14.0, 0.0, 1.0, 720, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(20, 'Halloumi Grilled', 'breakfast', 80.00, 'g', 255.0, 16.0, 2.0, 20.0, 0.0, 2.0, 980, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(21, 'Knefeh (cheese) slice', 'breakfast', 130.00, 'g', 520.0, 16.0, 60.0, 24.0, 2.0, 35.0, 300, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(22, 'Knefeh (ashta) slice', 'breakfast', 130.00, 'g', 510.0, 14.0, 58.0, 24.0, 2.0, 35.0, 280, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(23, 'Pita + Olive Oil & Zaatar dip', 'breakfast', 90.00, 'g', 360.0, 9.0, 43.0, 17.0, 3.0, 2.0, 620, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(24, 'Molasses & Tahini on Bread (Dibs w Tahini)', 'breakfast', 60.00, 'g', 260.0, 5.0, 28.0, 13.0, 2.0, 22.0, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(25, 'Honey & Cheese Pita', 'breakfast', 110.00, 'g', 360.0, 13.0, 46.0, 12.0, 1.0, 18.0, 720, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(26, 'Peanut Butter Pita', 'breakfast', 100.00, 'g', 410.0, 15.0, 35.0, 24.0, 6.0, 9.0, 460, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(27, 'Za\'atar & Tomato Salad', 'breakfast', 180.00, 'g', 120.0, 4.0, 14.0, 6.0, 4.0, 6.0, 540, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(28, 'Cucumber & Labneh Bowl', 'breakfast', 180.00, 'g', 210.0, 13.0, 11.0, 13.0, 0.0, 10.0, 380, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(29, 'Cheese Omelette', 'breakfast', 180.00, 'g', 340.0, 21.0, 4.0, 27.0, 0.0, 2.0, 680, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(30, 'Mushroom Omelette', 'breakfast', 200.00, 'g', 300.0, 20.0, 6.0, 22.0, 1.0, 3.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(31, 'Thyme Omelette (Ijjeh b Za\'atar)', 'breakfast', 170.00, 'g', 300.0, 18.0, 6.0, 22.0, 2.0, 2.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(32, 'Saj Wrap Zaatar', 'breakfast', 120.00, 'g', 340.0, 9.0, 47.0, 12.0, 3.0, 2.0, 620, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(33, 'Saj Wrap Kishk', 'breakfast', 140.00, 'g', 360.0, 12.0, 48.0, 12.0, 3.0, 5.0, 800, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(34, 'Saj Wrap Lahm bi Ajin', 'breakfast', 150.00, 'g', 390.0, 17.0, 42.0, 16.0, 2.0, 3.0, 650, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(35, 'Kaak with Cheese', 'breakfast', 150.00, 'g', 450.0, 17.0, 47.0, 20.0, 3.0, 3.0, 900, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(36, 'Fatteh Hummus (breakfast)', 'breakfast', 220.00, 'g', 420.0, 17.0, 36.0, 22.0, 6.0, 5.0, 820, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(37, 'Msabbaha Sandwich', 'breakfast', 200.00, 'g', 480.0, 16.0, 60.0, 18.0, 10.0, 5.0, 900, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(38, 'Falafel Plate (no bread)', 'breakfast', 150.00, 'g', 500.0, 16.0, 28.0, 34.0, 10.0, 3.0, 700, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(39, 'Jebneh Belaban (yogurt cheese) spread', 'breakfast', 60.00, 'g', 150.0, 9.0, 4.0, 11.0, 0.0, 3.0, 380, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(40, 'Choco-Hazelnut Spread Pita', 'breakfast', 80.00, 'g', 370.0, 6.0, 40.0, 20.0, 3.0, 28.0, 140, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(41, 'Olive Platter (breakfast portion)', 'breakfast', 40.00, 'g', 120.0, 1.0, 1.0, 12.0, 2.0, 0.0, 560, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(42, 'Tomato-Cucumber-Olive Salad', 'breakfast', 200.00, 'g', 150.0, 4.0, 12.0, 10.0, 4.0, 7.0, 620, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(43, 'Foul Sandwich', 'breakfast', 220.00, 'g', 520.0, 18.0, 74.0, 14.0, 12.0, 4.0, 980, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(44, 'Msabbaha & Pickles Plate', 'breakfast', 240.00, 'g', 380.0, 14.0, 44.0, 16.0, 8.0, 6.0, 820, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(45, 'Labneh & Honey on Kaak', 'breakfast', 160.00, 'g', 460.0, 15.0, 59.0, 18.0, 2.0, 26.0, 760, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(46, 'Hummus & Pine Nuts', 'breakfast', 160.00, 'g', 330.0, 12.0, 18.0, 22.0, 6.0, 2.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(47, 'Fava Beans with Tahini & Lemon', 'breakfast', 180.00, 'g', 260.0, 12.0, 29.0, 9.0, 10.0, 2.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(48, 'Chickpeas with Cumin & Olive Oil', 'breakfast', 180.00, 'g', 300.0, 14.0, 36.0, 10.0, 11.0, 3.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(49, 'Yogurt (Laban) with Cereal', 'breakfast', 200.00, 'g', 220.0, 11.0, 30.0, 6.0, 3.0, 18.0, 180, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(50, 'Fruit & Labneh Bowl', 'breakfast', 220.00, 'g', 240.0, 12.0, 28.0, 8.0, 4.0, 22.0, 180, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(51, 'Chicken Shawarma Plate (no bread)', 'lunch', 200.00, 'g', 360.0, 35.0, 6.0, 22.0, 2.0, 3.0, 920, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(52, 'Beef Shawarma Plate (no bread)', 'lunch', 200.00, 'g', 420.0, 32.0, 4.0, 30.0, 1.0, 2.0, 980, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(53, 'Chicken Shawarma Wrap', 'lunch', 250.00, 'g', 600.0, 35.0, 60.0, 22.0, 4.0, 5.0, 1400, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(54, 'Beef Shawarma Wrap', 'lunch', 250.00, 'g', 650.0, 32.0, 58.0, 28.0, 3.0, 5.0, 1500, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(55, 'Shish Taouk (grilled chicken)', 'lunch', 180.00, 'g', 300.0, 36.0, 3.0, 14.0, 1.0, 2.0, 780, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(56, 'Kafta Meshwi (grilled)', 'lunch', 180.00, 'g', 390.0, 31.0, 5.0, 28.0, 0.0, 2.0, 720, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(57, 'Kebab Halabi (grilled)', 'lunch', 180.00, 'g', 420.0, 30.0, 6.0, 31.0, 0.0, 2.0, 760, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(58, 'Kibbeh (baked)', 'lunch', 200.00, 'g', 400.0, 34.0, 20.0, 22.0, 3.0, 2.0, 880, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(59, 'Kibbeh (fried)', 'lunch', 200.00, 'g', 520.0, 30.0, 24.0, 34.0, 3.0, 2.0, 900, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(60, 'Kibbeh Labniyeh (in yogurt sauce)', 'lunch', 220.00, 'g', 460.0, 28.0, 26.0, 26.0, 2.0, 7.0, 900, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(61, 'Stuffed Zucchini (Kousa Mehshi)', 'lunch', 250.00, 'g', 380.0, 20.0, 32.0, 18.0, 5.0, 8.0, 900, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(62, 'Stuffed Eggplant (Batenjan Mehshi)', 'lunch', 250.00, 'g', 410.0, 18.0, 34.0, 24.0, 7.0, 9.0, 920, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(63, 'Waraq Enab bil Zeit (grape leaves, veg)', 'lunch', 200.00, 'g', 320.0, 6.0, 44.0, 14.0, 6.0, 6.0, 760, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(64, 'Waraq Enab with Meat', 'lunch', 220.00, 'g', 380.0, 14.0, 44.0, 16.0, 6.0, 7.0, 820, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(65, 'Fasolia bi Lahme (beans & meat)', 'lunch', 300.00, 'g', 420.0, 28.0, 38.0, 16.0, 10.0, 6.0, 940, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(66, 'Fasolia b Zeit (vegan)', 'lunch', 300.00, 'g', 370.0, 15.0, 44.0, 14.0, 11.0, 9.0, 860, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(67, 'Bamia with Meat', 'lunch', 300.00, 'g', 390.0, 23.0, 36.0, 16.0, 10.0, 8.0, 900, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(68, 'Loubieh b Zeit (green beans, oil)', 'lunch', 300.00, 'g', 340.0, 10.0, 36.0, 16.0, 10.0, 8.0, 860, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(69, 'Mloukhiyeh with Chicken (no rice)', 'lunch', 300.00, 'g', 280.0, 28.0, 14.0, 12.0, 8.0, 3.0, 820, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(70, 'Rice (white, cooked)', 'lunch', 150.00, 'g', 195.0, 4.0, 42.0, 0.5, 0.6, 0.1, 2, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(71, 'Riz aa Djej (chicken & rice)', 'lunch', 300.00, 'g', 540.0, 34.0, 62.0, 16.0, 3.0, 3.0, 980, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(72, 'Sayadiyeh (fish & rice)', 'lunch', 300.00, 'g', 520.0, 32.0, 68.0, 12.0, 3.0, 5.0, 980, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(73, 'Grilled Seabass Fillet', 'lunch', 180.00, 'g', 270.0, 34.0, 0.0, 12.0, 0.0, 0.0, 200, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(74, 'Fried Fish Fillet', 'lunch', 180.00, 'g', 420.0, 30.0, 14.0, 28.0, 0.0, 1.0, 360, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(75, 'Dawood Basha (meatballs)', 'lunch', 280.00, 'g', 520.0, 30.0, 34.0, 28.0, 5.0, 9.0, 980, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(76, 'Maghmour (eggplant stew)', 'lunch', 300.00, 'g', 360.0, 12.0, 36.0, 18.0, 10.0, 10.0, 860, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(77, 'Batata Harra (spicy potatoes)', 'lunch', 200.00, 'g', 330.0, 6.0, 46.0, 13.0, 6.0, 3.0, 720, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(78, 'Fattet Batinjan', 'lunch', 280.00, 'g', 520.0, 22.0, 48.0, 26.0, 6.0, 6.0, 940, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(79, 'Freekeh with Chicken', 'lunch', 300.00, 'g', 530.0, 34.0, 62.0, 16.0, 10.0, 3.0, 980, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(80, 'Bulgur Pilaf (burghul)', 'lunch', 200.00, 'g', 230.0, 6.0, 44.0, 4.0, 8.0, 1.0, 20, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(81, 'Grilled Lamb Chops', 'lunch', 200.00, 'g', 520.0, 44.0, 0.0, 38.0, 0.0, 0.0, 240, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(82, 'Grilled Chicken Breast', 'lunch', 180.00, 'g', 300.0, 38.0, 0.0, 14.0, 0.0, 0.0, 200, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(83, 'Rotisserie Chicken (quarter)', 'lunch', 220.00, 'g', 420.0, 36.0, 0.0, 30.0, 0.0, 0.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(84, 'Chicken Liver in Pomegranate Molasses', 'lunch', 200.00, 'g', 420.0, 30.0, 22.0, 24.0, 2.0, 12.0, 880, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(85, 'Sfiha Baalbakieh (2 pieces)', 'lunch', 160.00, 'g', 460.0, 18.0, 50.0, 22.0, 3.0, 4.0, 820, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(86, 'Fatayer Spinach (2 pieces)', 'lunch', 140.00, 'g', 360.0, 12.0, 46.0, 14.0, 5.0, 3.0, 780, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(87, 'Sambousek Meat (4 small)', 'lunch', 140.00, 'g', 520.0, 16.0, 36.0, 34.0, 2.0, 2.0, 740, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(88, 'Sambousek Cheese (4 small)', 'lunch', 140.00, 'g', 540.0, 18.0, 34.0, 36.0, 1.0, 2.0, 900, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(89, 'Fattet Hummus (lunch)', 'lunch', 300.00, 'g', 620.0, 24.0, 58.0, 30.0, 8.0, 5.0, 980, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(90, 'Grilled Veggie Plate', 'lunch', 250.00, 'g', 210.0, 6.0, 28.0, 8.0, 10.0, 10.0, 260, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(91, 'Fattoush', 'lunch', 220.00, 'g', 190.0, 5.0, 26.0, 9.0, 6.0, 4.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(92, 'Tabbouleh', 'lunch', 220.00, 'g', 140.0, 4.0, 22.0, 4.0, 6.0, 4.0, 160, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(93, 'Baba Ghanouj', 'lunch', 180.00, 'g', 210.0, 4.0, 16.0, 15.0, 6.0, 7.0, 480, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(94, 'Moutabbal (eggplant tahini dip)', 'lunch', 160.00, 'g', 240.0, 6.0, 12.0, 18.0, 5.0, 3.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(95, 'Hummus Beiruti (garlicky)', 'lunch', 160.00, 'g', 260.0, 11.0, 20.0, 15.0, 6.0, 2.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(96, 'Arayes (meat in pita) (2 halves)', 'lunch', 180.00, 'g', 520.0, 26.0, 40.0, 28.0, 3.0, 4.0, 920, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(97, 'Shawarma Fries Side', 'lunch', 150.00, 'g', 430.0, 5.0, 54.0, 20.0, 5.0, 1.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(98, 'Pickles Assortment', 'lunch', 80.00, 'g', 40.0, 1.0, 8.0, 0.0, 2.0, 2.0, 780, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(99, 'Garlic Sauce (Toum)', 'lunch', 40.00, 'g', 240.0, 1.0, 4.0, 24.0, 0.0, 1.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(100, 'Tahini Sauce', 'lunch', 40.00, 'g', 230.0, 6.0, 4.0, 20.0, 2.0, 0.0, 60, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(101, 'Lentil Soup (Shorbet Adas)', 'dinner', 300.00, 'g', 240.0, 16.0, 34.0, 4.0, 12.0, 3.0, 480, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(102, 'Chicken & Vegetable Soup', 'dinner', 300.00, 'g', 210.0, 20.0, 20.0, 6.0, 4.0, 4.0, 620, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(103, 'Fattoush (dinner)', 'dinner', 240.00, 'g', 210.0, 6.0, 28.0, 10.0, 7.0, 5.0, 560, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(104, 'Tabbouleh (dinner)', 'dinner', 240.00, 'g', 150.0, 5.0, 24.0, 4.0, 7.0, 5.0, 200, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(105, 'Rocca (Arugula) Salad with Halloumi', 'dinner', 220.00, 'g', 320.0, 18.0, 12.0, 22.0, 3.0, 4.0, 920, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(106, 'Greek-style Salad (Lebanese twist)', 'dinner', 250.00, 'g', 280.0, 10.0, 16.0, 20.0, 6.0, 7.0, 980, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(107, 'Grilled Chicken Salad', 'dinner', 260.00, 'g', 330.0, 32.0, 14.0, 16.0, 6.0, 5.0, 840, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(108, 'Tuna Pita Sandwich', 'dinner', 200.00, 'g', 420.0, 26.0, 42.0, 14.0, 4.0, 4.0, 880, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(109, 'Turkey & Cheese Pita', 'dinner', 200.00, 'g', 420.0, 28.0, 42.0, 14.0, 3.0, 3.0, 940, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(110, 'Sujuk Sandwich', 'dinner', 220.00, 'g', 640.0, 24.0, 46.0, 40.0, 3.0, 4.0, 1500, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(111, 'Makanek Sandwich', 'dinner', 220.00, 'g', 620.0, 24.0, 46.0, 38.0, 3.0, 4.0, 1480, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(112, 'Grilled Halloumi & Tomato', 'dinner', 180.00, 'g', 350.0, 20.0, 8.0, 26.0, 1.0, 4.0, 1100, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(113, 'Hummus with Beef (Hummus Awarma)', 'dinner', 220.00, 'g', 480.0, 24.0, 18.0, 34.0, 6.0, 2.0, 820, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(114, 'Baba Ghanouj with Pomegranate', 'dinner', 200.00, 'g', 260.0, 5.0, 22.0, 18.0, 6.0, 10.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(115, 'Mutabbal & Pita Chips', 'dinner', 200.00, 'g', 340.0, 8.0, 32.0, 20.0, 6.0, 6.0, 620, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(116, 'Chicken Skewers (small portion)', 'dinner', 140.00, 'g', 220.0, 28.0, 2.0, 10.0, 0.0, 1.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(117, 'Beef Skewers (small portion)', 'dinner', 140.00, 'g', 280.0, 24.0, 2.0, 18.0, 0.0, 1.0, 560, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(118, 'Veggie Omelette (dinner)', 'dinner', 180.00, 'g', 290.0, 18.0, 8.0, 20.0, 2.0, 5.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(119, 'Mini Fatayer Spinach (3)', 'dinner', 150.00, 'g', 370.0, 12.0, 48.0, 14.0, 5.0, 4.0, 820, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(120, 'Mini Cheese Sambousek (6)', 'dinner', 160.00, 'g', 560.0, 18.0, 36.0, 38.0, 2.0, 3.0, 940, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(121, 'Roasted Cauliflower with Tahini', 'dinner', 240.00, 'g', 280.0, 10.0, 22.0, 16.0, 9.0, 6.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(122, 'Grilled Eggplant with Yogurt', 'dinner', 240.00, 'g', 260.0, 9.0, 18.0, 16.0, 7.0, 8.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(123, 'Quinoa Tabbouleh (Levantine-inspired)', 'dinner', 240.00, 'g', 280.0, 10.0, 36.0, 10.0, 7.0, 5.0, 220, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(124, 'Roasted Beet & Walnut Salad', 'dinner', 240.00, 'g', 320.0, 10.0, 26.0, 22.0, 7.0, 12.0, 420, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(125, 'Avocado & Tomato Salad', 'dinner', 220.00, 'g', 320.0, 5.0, 16.0, 26.0, 8.0, 4.0, 200, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(126, 'Shish Taouk Wrap (small)', 'dinner', 180.00, 'g', 420.0, 24.0, 38.0, 18.0, 3.0, 4.0, 1100, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(127, 'Kafta Wrap (small)', 'dinner', 180.00, 'g', 460.0, 22.0, 40.0, 24.0, 3.0, 4.0, 1120, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(128, 'Tawook & Garlic Plate (light)', 'dinner', 200.00, 'g', 320.0, 30.0, 8.0, 16.0, 2.0, 2.0, 840, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(129, 'Fava Bean Salad (Lebanese)', 'dinner', 240.00, 'g', 300.0, 15.0, 36.0, 10.0, 12.0, 6.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(130, 'Chickpea Salad (Balila style)', 'dinner', 240.00, 'g', 340.0, 15.0, 42.0, 10.0, 12.0, 6.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(131, 'Laban Cucumber Salad (Ayran Khiyar)', 'dinner', 220.00, 'g', 160.0, 9.0, 10.0, 9.0, 1.0, 7.0, 360, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(132, 'Stuffed Grape Leaves (light plate)', 'dinner', 200.00, 'g', 280.0, 6.0, 40.0, 10.0, 6.0, 6.0, 760, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(133, 'Grilled Veggies & Halloumi Skewers', 'dinner', 220.00, 'g', 310.0, 16.0, 12.0, 22.0, 4.0, 5.0, 920, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(134, 'Mujaddara (lentils & bulgur)', 'dinner', 240.00, 'g', 350.0, 14.0, 54.0, 6.0, 12.0, 2.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(135, 'Mujaddara with Caramelized Onions', 'dinner', 260.00, 'g', 380.0, 14.0, 58.0, 8.0, 12.0, 6.0, 560, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(136, 'Tuna Salad with Sweetcorn', 'dinner', 240.00, 'g', 340.0, 20.0, 20.0, 18.0, 5.0, 6.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(137, 'Chicken Caesar (Lebanese light)', 'dinner', 260.00, 'g', 360.0, 28.0, 16.0, 20.0, 4.0, 3.0, 760, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(138, 'Hummus & Veggie Platter', 'dinner', 280.00, 'g', 360.0, 12.0, 32.0, 20.0, 10.0, 8.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(139, 'Grilled Mushrooms & Garlic', 'dinner', 220.00, 'g', 200.0, 9.0, 18.0, 10.0, 5.0, 5.0, 420, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(140, 'Tomato-Basil & Akkawi Salad', 'dinner', 220.00, 'g', 300.0, 15.0, 16.0, 18.0, 3.0, 10.0, 920, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(141, 'Olive Oil & Thyme Pita Chips', 'dinner', 60.00, 'g', 300.0, 6.0, 40.0, 12.0, 2.0, 1.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(142, 'Bulgur & Tomato Salad', 'dinner', 240.00, 'g', 300.0, 8.0, 50.0, 6.0, 9.0, 7.0, 200, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(143, 'Grilled Shrimp Skewers', 'dinner', 160.00, 'g', 210.0, 28.0, 2.0, 10.0, 0.0, 2.0, 360, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(144, 'Spiced Chickpea & Eggplant Bowl', 'dinner', 280.00, 'g', 400.0, 14.0, 52.0, 14.0, 12.0, 10.0, 620, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(145, 'Roasted Sweet Potato with Tahini', 'dinner', 240.00, 'g', 350.0, 6.0, 54.0, 12.0, 8.0, 13.0, 260, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(146, 'Zucchini Fritters (light)', 'dinner', 180.00, 'g', 320.0, 12.0, 28.0, 18.0, 4.0, 4.0, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(147, 'Chicken & Rice Soup (light)', 'dinner', 300.00, 'g', 220.0, 20.0, 24.0, 6.0, 1.0, 2.0, 620, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(148, 'Tomato Lentil Stew', 'dinner', 300.00, 'g', 320.0, 18.0, 44.0, 6.0, 11.0, 6.0, 620, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(149, 'Eggplant Rolls with Labneh', 'dinner', 220.00, 'g', 300.0, 12.0, 20.0, 18.0, 6.0, 8.0, 620, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(150, 'Tahini Lemon Dressing (side)', 'dinner', 30.00, 'g', 170.0, 5.0, 3.0, 15.0, 1.0, 0.0, 60, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(151, 'Apple', 'snack', 182.00, 'g', 95.0, 0.5, 25.0, 0.3, 4.4, 19.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(152, 'Banana', 'snack', 118.00, 'g', 105.0, 1.3, 27.0, 0.4, 3.1, 14.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(153, 'Orange', 'snack', 140.00, 'g', 69.0, 1.3, 18.0, 0.2, 3.1, 12.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(154, 'Grapes', 'snack', 92.00, 'g', 62.0, 0.6, 16.0, 0.3, 0.8, 15.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(155, 'Pear', 'snack', 178.00, 'g', 101.0, 0.6, 27.0, 0.3, 5.5, 17.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(156, 'Peach', 'snack', 150.00, 'g', 59.0, 1.4, 14.0, 0.4, 2.3, 13.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(157, 'Apricot', 'snack', 114.00, 'g', 48.0, 1.4, 12.0, 0.4, 2.1, 9.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(158, 'Plum', 'snack', 66.00, 'g', 46.0, 0.7, 11.0, 0.3, 1.4, 10.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(159, 'Fig (fresh)', 'snack', 50.00, 'g', 37.0, 0.4, 10.0, 0.2, 1.4, 8.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(160, 'Watermelon (cup)', 'snack', 152.00, 'g', 46.0, 0.9, 12.0, 0.2, 0.6, 9.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(161, 'Pomegranate arils (cup)', 'snack', 174.00, 'g', 144.0, 3.0, 32.0, 2.0, 7.0, 24.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(162, 'Strawberries (cup)', 'snack', 152.00, 'g', 49.0, 1.0, 12.0, 0.5, 3.0, 7.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(163, 'Cherries (cup)', 'snack', 138.00, 'g', 87.0, 1.5, 22.0, 0.3, 2.9, 18.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(164, 'Dates (3 Medjool)', 'snack', 72.00, 'g', 199.0, 1.7, 54.0, 0.2, 4.8, 48.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(165, 'Dried Apricots (40g)', 'snack', 40.00, 'g', 96.0, 1.4, 25.0, 0.3, 2.7, 17.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(166, 'Dried Figs (40g)', 'snack', 40.00, 'g', 95.0, 1.2, 24.0, 0.3, 3.7, 19.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(167, 'Raisins (40g)', 'snack', 40.00, 'g', 120.0, 1.3, 32.0, 0.2, 1.6, 26.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(168, 'Mulberries (cup)', 'snack', 140.00, 'g', 60.0, 2.0, 14.0, 0.4, 2.4, 11.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(169, 'Cantaloupe (cup)', 'snack', 156.00, 'g', 54.0, 1.3, 13.0, 0.3, 1.4, 12.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(170, 'Kiwi (2)', 'snack', 150.00, 'g', 90.0, 2.0, 21.0, 0.8, 4.0, 14.0, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(171, 'Almonds', 'snack', 28.00, 'g', 164.0, 6.0, 6.0, 14.0, 3.5, 1.2, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(172, 'Pistachios', 'snack', 28.00, 'g', 159.0, 6.0, 8.0, 13.0, 2.9, 2.2, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(173, 'Walnuts', 'snack', 28.00, 'g', 185.0, 4.3, 4.0, 18.0, 1.9, 1.1, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(174, 'Hazelnuts', 'snack', 28.00, 'g', 178.0, 4.2, 5.0, 17.0, 2.7, 1.2, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(175, 'Cashews', 'snack', 28.00, 'g', 157.0, 5.2, 9.0, 12.0, 1.0, 1.7, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(176, 'Peanuts', 'snack', 28.00, 'g', 166.0, 7.0, 6.0, 14.0, 2.4, 1.3, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(177, 'Pine Nuts', 'snack', 28.00, 'g', 191.0, 3.9, 3.7, 19.0, 1.0, 1.0, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(178, 'Pumpkin Seeds', 'snack', 28.00, 'g', 151.0, 7.0, 5.0, 13.0, 1.1, 0.4, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(179, 'Sunflower Seeds', 'snack', 28.00, 'g', 164.0, 5.5, 6.0, 14.0, 3.0, 1.7, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(180, 'Sesame Seeds', 'snack', 28.00, 'g', 163.0, 5.0, 7.0, 14.0, 3.3, 0.2, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(181, 'Roasted Chickpeas (snack)', 'snack', 30.00, 'g', 120.0, 5.0, 18.0, 2.0, 5.0, 3.0, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(182, 'Mixed Nuts (light salted)', 'snack', 28.00, 'g', 170.0, 5.0, 6.0, 15.0, 2.5, 1.5, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(183, 'Tahini (1 tbsp)', 'snack', 16.00, 'g', 89.0, 3.0, 3.0, 8.0, 1.3, 0.1, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(184, 'Halawa bite (20g)', 'snack', 20.00, 'g', 100.0, 2.4, 7.0, 7.4, 0.6, 6.0, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(185, 'Peanut Butter (1 tbsp)', 'snack', 16.00, 'g', 94.0, 4.0, 3.0, 8.0, 1.0, 1.3, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(186, 'Olives (small handful)', 'snack', 25.00, 'g', 73.0, 0.5, 1.8, 7.0, 1.6, 0.0, 350, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(187, 'Pickled Turnips', 'snack', 50.00, 'g', 12.0, 0.4, 2.6, 0.1, 1.4, 1.4, 520, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(188, 'Hummus (snack cup)', 'snack', 60.00, 'g', 100.0, 4.8, 8.0, 6.0, 2.4, 0.6, 180, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(189, 'Baba Ghanouj (snack cup)', 'snack', 60.00, 'g', 80.0, 1.5, 6.0, 6.0, 2.2, 2.6, 180, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(190, 'Labneh (small cup)', 'snack', 60.00, 'g', 120.0, 6.0, 5.0, 8.0, 0.0, 4.0, 180, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(191, 'Pita Chips (small)', 'snack', 30.00, 'g', 150.0, 3.0, 20.0, 6.0, 1.5, 0.8, 220, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(192, 'Popcorn (air-popped)', 'snack', 20.00, 'g', 78.0, 3.0, 14.0, 1.0, 3.0, 0.2, 5, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(193, 'Toasted Nuts Cone', 'snack', 35.00, 'g', 210.0, 6.0, 7.0, 18.0, 2.0, 2.0, 120, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(194, 'Baklava piece', 'snack', 45.00, 'g', 240.0, 3.0, 22.0, 15.0, 1.0, 12.0, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(195, 'Maamoul (date) piece', 'snack', 50.00, 'g', 235.0, 4.0, 35.0, 8.0, 2.0, 14.0, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(196, 'Maamoul (walnut) piece', 'snack', 50.00, 'g', 250.0, 4.0, 28.0, 14.0, 2.0, 12.0, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(197, 'Ghraybeh cookie', 'snack', 25.00, 'g', 125.0, 1.5, 12.0, 8.0, 0.4, 5.0, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(198, 'Barazek cookie', 'snack', 30.00, 'g', 160.0, 3.0, 16.0, 9.0, 1.6, 7.0, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(199, 'Sfouf slice', 'snack', 80.00, 'g', 310.0, 6.0, 54.0, 6.0, 1.5, 28.0, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(200, 'Knefeh bite', 'snack', 60.00, 'g', 240.0, 7.0, 28.0, 10.0, 0.8, 18.0, 80, '2025-09-15 05:52:57', '2025-09-15 05:52:57'),
(601, 'Manakish Zaatar', 'breakfast', 100.00, 'g', 270.0, 5.7, 37.8, 12.4, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(602, 'Labneh (full-fat)', 'breakfast', 100.00, 'g', 154.0, 9.0, 7.0, 10.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(603, 'Halloumi Cheese (grilled)', 'breakfast', 100.00, 'g', 370.0, 19.8, 1.0, 32.8, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(604, 'Hummus (home-style)', 'breakfast', 100.00, 'g', 177.0, 4.9, 20.1, 8.6, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(605, 'Foul Moudammas (broad beans stew)', 'breakfast', 100.00, 'g', 80.0, 6.0, 12.0, 0.4, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(606, 'Balila (boiled chickpeas)', 'breakfast', 100.00, 'g', 164.0, 8.9, 27.4, 2.6, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(607, 'Egg Omelette (plain)', 'breakfast', 100.00, 'g', 154.0, 10.6, 0.6, 12.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(608, 'Pita Bread (white)', 'breakfast', 100.00, 'g', 275.0, 9.1, 55.7, 1.2, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(609, 'Green Olives (pickled)', 'breakfast', 100.00, 'g', 145.0, 1.0, 3.8, 15.3, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(610, 'Labneh & Olive Oil (spread)', 'breakfast', 100.00, 'g', 205.0, 7.0, 6.0, 16.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(611, 'Cheese & Thyme Saj Roll', 'breakfast', 100.00, 'g', 290.0, 10.0, 35.0, 12.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(612, 'Mankoushe Lahme (meat flatbread)', 'breakfast', 100.00, 'g', 250.0, 12.0, 26.0, 10.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(613, 'Knefeh (cheese pastry)', 'breakfast', 100.00, 'g', 421.0, 9.0, 57.0, 21.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(614, 'Fried Eggs', 'breakfast', 100.00, 'g', 196.0, 13.6, 0.9, 15.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(615, 'Laban (plain yogurt)', 'breakfast', 100.00, 'g', 61.0, 3.5, 4.7, 3.2, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(616, 'Labneh Sandwich (pita, labneh, veg)', 'breakfast', 100.00, 'g', 210.0, 8.0, 22.0, 9.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(617, 'Cheese Manakish', 'breakfast', 100.00, 'g', 290.0, 12.0, 32.0, 12.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(618, 'Fava Beans (boiled)', 'breakfast', 100.00, 'g', 110.0, 7.6, 19.0, 0.4, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(619, 'Mortadella & Cheese Sandwich (pita)', 'breakfast', 100.00, 'g', 260.0, 12.0, 26.0, 12.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(620, 'Zaatar Wrap (saj)', 'breakfast', 100.00, 'g', 300.0, 7.0, 40.0, 12.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(621, 'Fattoush', 'lunch', 100.00, 'g', 158.0, 2.4, 15.1, 10.2, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(622, 'Tabbouleh', 'lunch', 100.00, 'g', 119.0, 2.3, 13.3, 6.1, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(623, 'Chicken Shawarma (meat only)', 'lunch', 100.00, 'g', 175.0, 20.0, 0.0, 9.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(624, 'Beef Shawarma (meat only)', 'lunch', 100.00, 'g', 288.0, 26.3, 0.0, 19.5, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(625, 'Shish Tawook (grilled chicken)', 'lunch', 100.00, 'g', 199.0, 24.0, 14.0, 5.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(626, 'Kafta (beef/parsley/onion)', 'lunch', 100.00, 'g', 218.0, 17.7, 0.1, 3.9, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(627, 'Kibbeh (fried)', 'lunch', 100.00, 'g', 241.0, 13.0, 20.0, 12.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(628, 'Warak Enab (stuffed grape leaves w/ rice)', 'lunch', 100.00, 'g', 164.0, 2.2, 14.2, 11.6, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(629, 'Mujadara (lentils & rice)', 'lunch', 100.00, 'g', 180.0, 6.5, 33.0, 2.5, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(630, 'Falafel (fried)', 'lunch', 100.00, 'g', 333.0, 13.3, 31.8, 17.8, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(631, 'Loubieh bi Zeit (green beans in olive oil)', 'lunch', 100.00, 'g', 150.0, 3.0, 12.0, 10.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(632, 'Fasolia bi Lahme (bean & meat stew)', 'lunch', 100.00, 'g', 145.0, 9.0, 15.0, 5.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(633, 'Bamia (okra stew)', 'lunch', 100.00, 'g', 110.0, 3.0, 11.0, 6.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(634, 'Sayadieh (fish & rice)', 'lunch', 100.00, 'g', 198.0, 11.0, 22.0, 7.2, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(635, 'Freekeh with Chicken', 'lunch', 100.00, 'g', 262.0, 20.4, 17.4, 12.7, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(636, 'Arayes (kafta stuffed pita, grilled)', 'lunch', 100.00, 'g', 260.0, 14.0, 19.0, 15.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(637, 'Fatteh Hummus (yogurt, chickpeas, bread)', 'lunch', 100.00, 'g', 140.0, 4.8, 16.0, 6.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(638, 'Grilled Sea Bass (samke meshwi)', 'lunch', 100.00, 'g', 124.0, 23.0, 0.0, 3.5, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(639, 'Batata Harra (spicy potatoes)', 'lunch', 100.00, 'g', 180.0, 3.0, 27.0, 7.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(640, 'Chicken Liver with Pomegranate (Sawda Djej)', 'lunch', 100.00, 'g', 165.0, 20.0, 5.0, 6.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(641, 'Shish Kebab (lamb)', 'dinner', 100.00, 'g', 250.0, 25.0, 0.0, 16.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(642, 'Kibbeh bil Sanieh (baked tray kibbeh)', 'dinner', 100.00, 'g', 220.0, 12.0, 20.0, 10.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(643, 'Makanek (spiced sausages)', 'dinner', 100.00, 'g', 290.0, 15.0, 3.0, 24.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(644, 'Sujuk (spicy sausage)', 'dinner', 100.00, 'g', 316.0, 19.0, 2.0, 26.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(645, 'Riz a Djej (chicken & rice)', 'dinner', 100.00, 'g', 190.0, 12.0, 23.0, 5.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(646, 'Stuffed Marrow (Kousa Mahshi)', 'dinner', 100.00, 'g', 110.0, 6.0, 10.0, 5.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(647, 'Grilled Chicken (half, deboned)', 'dinner', 100.00, 'g', 220.0, 27.0, 0.0, 12.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(648, 'Beef Stew with Potatoes', 'dinner', 100.00, 'g', 160.0, 12.0, 10.0, 8.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(649, 'Spinach Stew (Sabanegh)', 'dinner', 100.00, 'g', 95.0, 5.0, 8.0, 5.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(650, 'Baba Ghanoush (eggplant & tahini)', 'dinner', 100.00, 'g', 170.0, 4.0, 12.0, 13.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(651, 'Kebbeh Nayyeh (raw kibbeh)', 'dinner', 100.00, 'g', 210.0, 20.0, 4.0, 13.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(652, 'Chicken & Vermicelli Rice', 'dinner', 100.00, 'g', 200.0, 10.0, 30.0, 5.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(653, 'Fried Cauliflower with Tahini', 'dinner', 100.00, 'g', 190.0, 4.0, 12.0, 15.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(654, 'Mixed Grill (kebab, tawook, kafta)', 'dinner', 100.00, 'g', 240.0, 23.0, 3.0, 15.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(655, 'Hindbeh (dandelion greens) with onions', 'dinner', 100.00, 'g', 150.0, 3.0, 14.0, 9.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(656, 'Samke Harra (spicy tahini fish)', 'dinner', 100.00, 'g', 210.0, 18.0, 5.0, 13.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(657, 'Moghrabieh (pearl couscous, chickpeas & chicken)', 'dinner', 100.00, 'g', 180.0, 9.0, 28.0, 4.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(658, 'Okra with Meat (Bamia bil lahme)', 'dinner', 100.00, 'g', 150.0, 8.0, 10.0, 9.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(659, 'Grilled Lamb Chops', 'dinner', 100.00, 'g', 282.0, 25.0, 0.0, 20.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(660, 'Roasted Potatoes with Herbs', 'dinner', 100.00, 'g', 160.0, 3.0, 28.0, 5.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(661, 'Gandour Unica Wafer (avg)', 'snack', 100.00, 'g', 224.0, 3.1, 30.2, 10.8, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(662, 'Gandour Tarboosh', 'snack', 100.00, 'g', 377.0, 1.0, 66.0, 13.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(663, 'Al Rifai Mixed Nuts (roasted)', 'snack', 100.00, 'g', 589.0, 18.0, 26.0, 37.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(664, 'Picon Cheese Portions', 'snack', 100.00, 'g', 300.0, 13.0, 10.0, 24.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(665, 'Baklava (assorted)', 'snack', 100.00, 'g', 430.0, 8.0, 60.0, 18.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(666, 'Maamoul (date cookie)', 'snack', 100.00, 'g', 420.0, 6.0, 65.0, 16.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(667, 'Halawa (sesame halva)', 'snack', 100.00, 'g', 510.0, 12.0, 40.0, 32.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(668, 'Roasted Chickpeas (snack)', 'snack', 100.00, 'g', 364.0, 19.0, 60.0, 6.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(669, 'Dates (Deglet Noor)', 'snack', 100.00, 'g', 282.0, 2.5, 75.0, 0.4, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(670, 'Fresh Figs', 'snack', 100.00, 'g', 74.0, 0.8, 19.2, 0.3, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(671, 'Pistachios (roasted, salted)', 'snack', 100.00, 'g', 562.0, 20.0, 28.0, 45.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(672, 'Walnuts (halves)', 'snack', 100.00, 'g', 654.0, 15.0, 14.0, 65.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(673, 'Kaak Bread Sticks', 'snack', 100.00, 'g', 410.0, 12.0, 70.0, 8.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(674, 'Zaatar Crackers', 'snack', 100.00, 'g', 450.0, 9.0, 63.0, 18.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(675, 'Raisins', 'snack', 100.00, 'g', 299.0, 3.1, 79.0, 0.5, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(676, 'Ayran (Laban Drink)', 'drink', 100.00, 'ml', 41.0, 3.0, 4.0, 1.5, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(677, 'Jallab (carob-date-molasses drink)', 'drink', 100.00, 'ml', 70.0, 0.3, 17.0, 0.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(678, 'Carob Drink (Debs el Kharoub)', 'drink', 100.00, 'ml', 56.0, 0.0, 13.0, 0.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(679, 'Tamarind Drink (Tamar Hindi)', 'drink', 100.00, 'ml', 60.0, 0.2, 15.0, 0.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(680, 'Limonana (lemon-mint)', 'drink', 100.00, 'ml', 45.0, 0.2, 11.0, 0.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(681, 'Arabic Coffee (unsweetened)', 'drink', 100.00, 'ml', 2.0, 0.3, 0.0, 0.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(682, 'Black Tea (unsweetened)', 'drink', 100.00, 'ml', 1.0, 0.0, 0.0, 0.0, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(683, 'Fresh Orange Juice', 'drink', 100.00, 'ml', 45.0, 0.7, 10.4, 0.2, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(684, 'Pomegranate Juice', 'drink', 100.00, 'ml', 54.0, 0.1, 13.0, 0.3, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17'),
(685, 'Carrot Juice (fresh)', 'drink', 100.00, 'ml', 40.0, 0.6, 9.3, 0.2, NULL, NULL, NULL, '2025-09-15 06:20:17', '2025-09-15 06:20:17');

-- --------------------------------------------------------

--
-- Table structure for table `foods_lebanon`
--

DROP TABLE IF EXISTS `foods_lebanon`;
CREATE TABLE IF NOT EXISTS `foods_lebanon` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `food` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `calories_kcal` decimal(8,1) NOT NULL,
  `protein_g` decimal(8,1) NOT NULL,
  `fat_g` decimal(8,1) NOT NULL,
  `carbs_g` decimal(8,1) NOT NULL,
  `fiber_g` decimal(8,1) DEFAULT NULL,
  `sugar_g` decimal(8,1) DEFAULT NULL,
  `sodium_mg` int UNSIGNED DEFAULT NULL,
  `vitamin_a_mcg` int UNSIGNED DEFAULT NULL,
  `vitamin_c_mg` decimal(8,1) DEFAULT NULL,
  `calcium_mg` int UNSIGNED DEFAULT NULL,
  `iron_mg` decimal(8,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_food` (`food`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `foods_lebanon`
--

INSERT INTO `foods_lebanon` (`id`, `food`, `category`, `calories_kcal`, `protein_g`, `fat_g`, `carbs_g`, `fiber_g`, `sugar_g`, `sodium_mg`, `vitamin_a_mcg`, `vitamin_c_mg`, `calcium_mg`, `iron_mg`, `created_at`, `updated_at`) VALUES
(1, 'food', 'category', 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0.0, 0, 0.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(2, 'Baba ghanouj', 'Appetizer', 250.0, 6.0, 18.0, 20.0, 7.0, 4.0, 450, 150, 12.0, 60, 1.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(3, 'Batata mahchi', 'Main', 400.0, 10.0, 20.0, 45.0, 6.0, 5.0, 600, 50, 20.0, 80, 2.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(4, 'Borgul bi banadoura', 'Main', 350.0, 9.0, 8.0, 65.0, 10.0, 8.0, 350, 100, 25.0, 70, 2.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(5, 'Chichbarak', 'Main', 500.0, 18.0, 25.0, 50.0, 4.0, 3.0, 700, 80, 6.0, 100, 2.80, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(6, 'Falafel', 'Snack', 550.0, 20.0, 30.0, 45.0, 12.0, 3.0, 800, 100, 10.0, 120, 3.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(7, 'Fatayer sabanikh', 'Pastry', 400.0, 12.0, 18.0, 50.0, 6.0, 2.0, 500, 200, 15.0, 100, 2.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(8, 'Fattat Hommos', 'Main', 450.0, 15.0, 20.0, 55.0, 9.0, 3.0, 750, 100, 12.0, 120, 3.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(9, 'Fattoush', 'Salad', 220.0, 5.0, 12.0, 25.0, 6.0, 4.0, 300, 250, 30.0, 60, 1.20, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(10, 'Foul moudamas', 'Main', 380.0, 16.0, 15.0, 45.0, 11.0, 1.0, 500, 50, 4.0, 90, 3.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(11, 'Hindbe bil zet', 'Side', 280.0, 7.0, 20.0, 20.0, 9.0, 2.0, 400, 200, 20.0, 140, 3.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(12, 'Hommos bi tahini', 'Appetizer', 350.0, 12.0, 18.0, 30.0, 7.0, 1.0, 420, 80, 2.0, 60, 2.20, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(13, 'Kafta wa batata', 'Main', 550.0, 25.0, 35.0, 40.0, 4.0, 2.0, 850, 70, 8.0, 90, 3.80, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(14, 'Kebba bil sayniya', 'Main', 500.0, 22.0, 28.0, 40.0, 3.0, 1.0, 700, 60, 6.0, 120, 3.20, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(15, 'Koussa mahchi', 'Main', 400.0, 15.0, 22.0, 38.0, 7.0, 3.0, 600, 80, 10.0, 100, 2.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(16, 'Lahm bil ajin', 'Pastry', 420.0, 18.0, 20.0, 48.0, 3.0, 1.0, 500, 60, 8.0, 70, 3.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(17, 'Loubia bil zet', 'Side', 300.0, 9.0, 16.0, 32.0, 9.0, 5.0, 450, 150, 25.0, 100, 2.80, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(18, 'Malfouf mahchi', 'Main', 350.0, 12.0, 16.0, 40.0, 7.0, 2.0, 550, 80, 15.0, 90, 2.40, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(19, 'Moujadara', 'Main', 420.0, 14.0, 12.0, 70.0, 10.0, 2.0, 350, 100, 25.0, 120, 3.60, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(20, 'Moghrabia', 'Main', 480.0, 20.0, 20.0, 55.0, 6.0, 1.0, 650, 90, 8.0, 140, 3.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(21, 'Moussaka batinjan', 'Main', 390.0, 10.0, 22.0, 35.0, 8.0, 5.0, 500, 120, 15.0, 110, 2.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(22, 'Riz a dajaj', 'Main', 520.0, 28.0, 22.0, 55.0, 3.0, 1.0, 750, 70, 6.0, 120, 3.80, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(23, 'Riz bi lahma', 'Main', 500.0, 26.0, 20.0, 52.0, 3.0, 1.0, 720, 70, 6.0, 110, 3.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(24, 'Sayadia', 'Main', 480.0, 30.0, 18.0, 50.0, 2.0, 1.0, 700, 60, 4.0, 130, 3.20, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(25, 'Shawarma dajaj', 'Main', 600.0, 35.0, 28.0, 45.0, 3.0, 2.0, 900, 80, 10.0, 140, 4.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(26, 'Shawarma lahma', 'Main', 620.0, 36.0, 30.0, 42.0, 2.0, 1.0, 950, 70, 8.0, 150, 4.20, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(27, 'Tabboula', 'Salad', 200.0, 5.0, 10.0, 25.0, 7.0, 2.0, 300, 300, 40.0, 70, 1.80, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(28, 'Warak enab', 'Appetizer', 280.0, 8.0, 12.0, 35.0, 6.0, 1.0, 450, 120, 15.0, 80, 2.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(29, 'Yakhnat Bamia', 'Main', 370.0, 12.0, 18.0, 38.0, 8.0, 4.0, 500, 150, 20.0, 100, 2.40, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(30, 'Yakhnat Fassoulia', 'Main', 380.0, 14.0, 16.0, 42.0, 9.0, 2.0, 520, 120, 15.0, 110, 2.60, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(31, 'Yakhnat Mouloukhia', 'Main', 400.0, 18.0, 20.0, 40.0, 10.0, 1.0, 550, 200, 25.0, 130, 3.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(32, 'Kibbeh nayyeh', 'Main', 420.0, 30.0, 22.0, 18.0, 2.0, 1.0, 750, 80, 6.0, 60, 4.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(33, 'Mloukhieh', 'Main', 380.0, 25.0, 15.0, 35.0, 8.0, 4.0, 600, 250, 30.0, 120, 5.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(34, 'Manakish zaatar (1 piece ~120g)', 'Snack', 340.0, 9.0, 14.0, 45.0, 5.0, 3.0, 500, 50, 2.0, 80, 3.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(35, 'Sfiha (1 piece ~100g)', 'Snack', 290.0, 12.0, 16.0, 25.0, 2.0, 2.0, 550, 60, 3.0, 50, 2.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(36, 'Tabbouleh (1 bowl ~150g)', 'Appetizer', 180.0, 4.0, 8.0, 22.0, 6.0, 3.0, 250, 300, 40.0, 70, 3.20, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(37, 'Chicken Shawarma Plate (1 serving ~350g)', 'Main', 650.0, 45.0, 28.0, 55.0, 6.0, 5.0, 950, 120, 15.0, 100, 4.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(38, 'Kafta with Rice (1 plate ~300g)', 'Main', 520.0, 32.0, 22.0, 45.0, 3.0, 2.0, 800, 90, 8.0, 80, 3.80, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(39, 'Knefeh (1 slice ~200g)', 'Dessert', 720.0, 18.0, 35.0, 80.0, 2.0, 45.0, 550, 120, 0.0, 200, 2.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(40, 'Ayran (1 cup ~250ml)', 'Drink', 120.0, 6.0, 6.0, 8.0, 0.0, 6.0, 400, 60, 0.0, 150, 0.20, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(41, 'Jallab (1 cup ~250ml)', 'Drink', 180.0, 1.0, 0.0, 45.0, 1.0, 40.0, 50, 10, 5.0, 20, 0.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(42, 'Fatteh (chickpeas & yogurt, 1 plate ~300g)', 'Main', 480.0, 20.0, 18.0, 55.0, 9.0, 6.0, 700, 110, 12.0, 160, 3.20, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(43, 'Wara\' Enab (stuffed grape leaves, 5 pcs ~150g)', 'Appetizer', 220.0, 5.0, 8.0, 32.0, 6.0, 3.0, 350, 90, 10.0, 60, 2.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(44, 'Moghrabieh (chicken & pearl couscous, 1 plate ~400g)', 'Main', 700.0, 35.0, 28.0, 70.0, 7.0, 5.0, 900, 150, 20.0, 110, 4.80, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(45, 'Foul Moudammas (1 bowl ~250g)', 'Main', 420.0, 20.0, 14.0, 55.0, 12.0, 5.0, 600, 50, 10.0, 100, 5.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(46, 'Grilled Fish with Tarator (1 plate ~300g)', 'Main', 560.0, 45.0, 30.0, 20.0, 3.0, 1.0, 750, 100, 5.0, 120, 3.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(47, 'Lahm Bi Ajin (1 piece ~100g)', 'Snack', 280.0, 12.0, 15.0, 25.0, 2.0, 2.0, 500, 70, 2.0, 50, 2.30, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(48, 'Saj Chicken Sandwich (1 wrap ~250g)', 'Snack', 520.0, 32.0, 20.0, 55.0, 4.0, 3.0, 850, 120, 12.0, 90, 3.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(49, 'Falafel Wrap (1 sandwich ~220g)', 'Snack', 600.0, 18.0, 25.0, 75.0, 10.0, 5.0, 900, 100, 20.0, 120, 4.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(50, 'Maamoul (1 piece ~50g)', 'Dessert', 200.0, 3.0, 10.0, 28.0, 2.0, 12.0, 60, 20, 0.0, 20, 0.80, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(51, 'Baklava (1 piece ~60g)', 'Dessert', 280.0, 5.0, 18.0, 28.0, 2.0, 15.0, 80, 30, 0.0, 25, 1.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(52, 'Rice Pudding (Riz bi Haleeb, 1 bowl ~200g)', 'Dessert', 310.0, 8.0, 9.0, 50.0, 1.0, 25.0, 120, 80, 2.0, 180, 1.20, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(53, 'Rose Syrup Drink (1 glass ~200ml)', 'Drink', 150.0, 0.0, 0.0, 38.0, 0.0, 36.0, 20, 0, 0.0, 5, 0.10, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(54, 'Arak (1 shot ~50ml)', 'Drink', 140.0, 0.0, 0.0, 2.0, 0.0, 0.0, 5, 0, 0.0, 0, 0.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(55, 'Labneh with Olive Oil (1 bowl ~150g)', 'Breakfast', 280.0, 12.0, 20.0, 8.0, 0.0, 6.0, 350, 100, 2.0, 180, 0.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(56, 'Balila (chickpeas, 1 bowl ~200g)', 'Breakfast', 350.0, 15.0, 10.0, 50.0, 12.0, 6.0, 500, 60, 6.0, 90, 4.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(57, 'Cheese Rolls (Rakakat, 3 pcs ~120g)', 'Appetizer', 420.0, 15.0, 25.0, 32.0, 2.0, 3.0, 650, 90, 0.0, 160, 1.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(58, 'Grilled Halloumi (1 serving ~100g)', 'Breakfast', 310.0, 20.0, 24.0, 2.0, 0.0, 1.0, 900, 80, 0.0, 700, 0.70, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(59, 'Sayadieh (fish & rice, 1 plate ~350g)', 'Main', 620.0, 40.0, 22.0, 70.0, 4.0, 2.0, 850, 90, 8.0, 120, 3.20, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(60, 'Fasolia bi Lahme (beans with meat, 1 plate ~300g)', 'Main', 540.0, 32.0, 18.0, 60.0, 10.0, 6.0, 750, 120, 15.0, 130, 4.00, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(61, 'Kousa Mahshi (stuffed zucchini, 3 pcs ~250g)', 'Main', 400.0, 18.0, 16.0, 45.0, 7.0, 5.0, 600, 100, 20.0, 90, 2.80, '2025-09-16 20:56:44', '2025-09-16 20:56:44'),
(62, 'Shish Tawouk with Garlic Sauce (1 plate ~350g)', 'Main', 680.0, 45.0, 28.0, 55.0, 3.0, 2.0, 950, 120, 12.0, 110, 3.50, '2025-09-16 20:56:44', '2025-09-16 20:56:44');

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
CREATE TABLE IF NOT EXISTS `jobs` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `queue` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint UNSIGNED NOT NULL,
  `reserved_at` int UNSIGNED DEFAULT NULL,
  `available_at` int UNSIGNED NOT NULL,
  `created_at` int UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_batches`
--

DROP TABLE IF EXISTS `job_batches`;
CREATE TABLE IF NOT EXISTS `job_batches` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `meal_entries`
--

DROP TABLE IF EXISTS `meal_entries`;
CREATE TABLE IF NOT EXISTS `meal_entries` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `food_id` bigint UNSIGNED NOT NULL,
  `meal_type` enum('breakfast','lunch','dinner','snack','drink') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `servings` decimal(8,2) NOT NULL DEFAULT '1.00',
  `eaten_at` date NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meal_entries_food_id_foreign` (`food_id`),
  KEY `meal_entries_user_id_eaten_at_index` (`user_id`,`eaten_at`),
  KEY `meal_entries_user_id_meal_type_eaten_at_index` (`user_id`,`meal_type`,`eaten_at`)
) ENGINE=MyISAM AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `meal_entries`
--

INSERT INTO `meal_entries` (`id`, `user_id`, `food_id`, `meal_type`, `servings`, `eaten_at`, `created_at`, `updated_at`) VALUES
(1, 1, 617, 'breakfast', 1.00, '2025-09-15', '2025-09-15 04:01:56', '2025-09-15 04:01:56'),
(2, 1, 84, 'lunch', 1.50, '2025-09-15', '2025-09-15 04:02:09', '2025-09-15 04:02:09'),
(3, 1, 125, 'dinner', 0.45, '2025-09-15', '2025-09-15 04:02:14', '2025-09-15 04:02:14'),
(4, 1, 152, 'snack', 0.42, '2025-09-15', '2025-09-15 04:02:26', '2025-09-15 04:02:26'),
(5, 1, 685, 'drink', 1.00, '2025-09-15', '2025-09-15 04:02:34', '2025-09-15 04:02:34'),
(6, 1, 117, 'dinner', 2.86, '2025-09-15', '2025-09-15 04:02:47', '2025-09-15 04:02:47'),
(7, 3, 614, 'breakfast', 2.50, '2025-09-15', '2025-09-15 10:47:05', '2025-09-15 10:47:05'),
(8, 3, 57, 'lunch', 1.67, '2025-09-15', '2025-09-15 10:47:54', '2025-09-15 10:47:54'),
(9, 3, 658, 'dinner', 3.00, '2025-09-15', '2025-09-15 10:48:14', '2025-09-15 10:48:14'),
(10, 3, 151, 'snack', 1.00, '2025-09-15', '2025-09-15 10:48:37', '2025-09-15 10:48:37');

-- --------------------------------------------------------

--
-- Table structure for table `meal_logs`
--

DROP TABLE IF EXISTS `meal_logs`;
CREATE TABLE IF NOT EXISTS `meal_logs` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `consumed_at` date NOT NULL,
  `other_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `photo_path` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `meal_logs_user_id_consumed_at_unique` (`user_id`,`consumed_at`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `meal_logs`
--

INSERT INTO `meal_logs` (`id`, `user_id`, `consumed_at`, `other_notes`, `photo_path`, `created_at`, `updated_at`) VALUES
(1, 3, '2025-09-14', NULL, 'meal-photos/O3mAuVFFRvmdzOj6U3aQn7ENXwYYOTn34jhQ4EGj.jpg', '2025-09-14 12:23:43', '2025-09-14 12:26:02');

-- --------------------------------------------------------

--
-- Table structure for table `meal_log_items`
--

DROP TABLE IF EXISTS `meal_log_items`;
CREATE TABLE IF NOT EXISTS `meal_log_items` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `meal_log_id` bigint UNSIGNED NOT NULL,
  `category` enum('breakfast','lunch','dinner','snack','drink') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(8,2) DEFAULT NULL,
  `unit` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `calories` int UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `meal_log_items_meal_log_id_category_index` (`meal_log_id`,`category`)
) ENGINE=MyISAM AUTO_INCREMENT=149 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `meal_log_items`
--

INSERT INTO `meal_log_items` (`id`, `meal_log_id`, `category`, `label`, `quantity`, `unit`, `calories`, `created_at`, `updated_at`) VALUES
(146, 1, 'snack', 'choco prince', 2.00, NULL, NULL, '2025-09-14 13:04:27', '2025-09-14 13:04:27'),
(147, 1, 'drink', 'Mocha', 2.00, NULL, NULL, '2025-09-14 13:04:27', '2025-09-14 13:04:27'),
(142, 1, 'breakfast', 'jebne sandwich', 1.00, NULL, NULL, '2025-09-14 13:04:27', '2025-09-14 13:04:27'),
(143, 1, 'lunch', 'hamburger', 1.00, NULL, NULL, '2025-09-14 13:04:27', '2025-09-14 13:04:27'),
(144, 1, 'lunch', 'fries', 1.00, NULL, NULL, '2025-09-14 13:04:27', '2025-09-14 13:04:27'),
(145, 1, 'dinner', 'lahm b aajin', 1.00, NULL, NULL, '2025-09-14 13:04:27', '2025-09-14 13:04:27'),
(148, 1, 'drink', 'pepsi', NULL, NULL, NULL, '2025-09-14 13:04:27', '2025-09-14 13:04:27');

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1),
(2, '0001_01_01_000001_create_cache_table', 1),
(3, '0001_01_01_000002_create_jobs_table', 1),
(4, '0001_01_01_000003_add_hayetak_fields_to_users_table', 1),
(5, '2025_09_13_152224_remove_name_from_users_table', 2),
(6, '2025_create_water_intake', 3),
(7, '2025_09_14_000000_create_diet_and_meal_logs_tables', 4),
(8, '2025_09_15_000000_create_meal_entries_table', 5),
(9, '2025_09_15_000001_create_foods_table', 6),
(10, '2025_09_15_000002_ensure_foods_unique_index', 6),
(11, '2025_09_15_000001_create_exercises_table', 7),
(12, '2025_09_15_000002_create_workout_plans_tables', 7),
(13, '2025_09_15_000003_create_workout_logs_tables', 7);

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES
('NqFj47EdDMB4rPdZskSSh7RsvuT2v7Avgksq7K8K', 1, '127.0.0.1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36', 'ZXlKcGRpSTZJbE5sY3pNMlVqRllkRmswYUhKc1JXVmxiRXcxTldjOVBTSXNJblpoYkhWbElqb2llV2hzZEVaYVZFZEtjbkpXUW13NFdVWnpTMUpFWkdGVlZHcHpOVTFoZERCMFdrUkJSREZ5YW5SWmVYQlFTVGh3TUd3d1Z5OXljVWR1TUhaMFpFSjFRbGt5ZVROdU1YTTVkblZxZDNCTlIwTTFhV2xYUVhrM2NuRmxhQ3RsZUhSNVRtUmxSMDVYZVVNclpsaDFNRE5LUW1Zd1VITlZkVUZIY1RSVWJ5dGlOR1pYVlc1elJ5dHZlVWxqWW05R1QxcFBRVVZrVW1wcWFVODFVMVZUYjI5clpteEtOR0p2VlhZd2FXWm1OR2g0VVZnek5uTnZOVlZ3V0VnMFQyTlBSbUpRYmtwblNXZHROV0p5U21sMVIxQjNLMmREYmsxblMyWkdUVW92V2sxaWN6WmhaWEZ0WXpSTFZrVXdOMkpXTm1OemJUSm5UVWgwVkhOb1NGZ3dabEZPT0U4elpqQlZXbVpDV0VGc1JsZE5hREJTVGxoWVUwbGplSGcxVDFWSmFuVmlXRTlPYlcxVlNGSlRiR0ZLZFRST2RFMHZaV05FVVZSelJWVXZaak15YmpZNE9YVjVTRXhuV1ZFd1VtSjFWMVl6YTBjMlJHMDNWRWhtZGpKSVdEaHRkM0JaYldWWFJuRktMemx1YkVoemRGTktNVUZUVjBGemRVNUNLMnRGWW5oVFFqVTNaRmRQU2pSQmFUZEhaMlJ3ZFZCalVYRlNRVDA5SWl3aWJXRmpJam9pT0RneU1tSTRaVFEyTkdVMllqVXdNVEl3Wm1JMFl6VXpPR0U0WkRaa09USTVabU0xTW1ObE4yVmlaR0ZqTWpCalpEWXpPR0UyTW1Wak1UWTFNREkzWVNJc0luUmhaeUk2SWlKOQ==', 1757950825),
('wJnisOrZnZchabEUL190rI4dogoIpw7G2Ki0OU8p', 3, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', 'YTo1OntzOjY6Il90b2tlbiI7czo0MDoic1o5VU5ZR2FzOEdrTDVsTWg3Qkg1THRiaE9WbE9iRGFyamVhZWY0UyI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJuZXciO2E6MDp7fXM6Mzoib2xkIjthOjA6e319czozOiJ1cmwiO2E6MDp7fXM6NTA6ImxvZ2luX3dlYl81OWJhMzZhZGRjMmIyZjk0MDE1ODBmMDE0YzdmNThlYTRlMzA5ODlkIjtpOjM7czoxODoibGFzdF9hY3Rpdml0eV90aW1lIjtpOjE3NTc5NTM4NTI7fQ==', 1757953852),
('lydmRltzHJzBA8KFbRUV0yU94qIzKKwjTVhArddM', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0', 'ZXlKcGRpSTZJa3QyV0ZGa1lucFFXR2hFWVVGQ0swRkNVRmc0WVZFOVBTSXNJblpoYkhWbElqb2laVkphZERsUFVrRnlRWGxEUmtWMFZFczFRalJoYVdOV00yVTRLM0JtTmpOWWREbG1PVXAwZVhKdGFEVTVZazExZUZaYWJ5OVJhV041VTFsWFUzVjBNRGR2T0dkS2RVTTJXbWRSUkhaYWN6TnBRa2N2TWtSRmJWUk1jbUpGYkVKaGVYSkVVak5DUm5kVWNrRktRV2hrTDB0MWFUQTJkRmhzT1VZd2NHeHpNWGR3UW1KWldFOTNMMmM1V0hwU1kyMVhSRTQ1Tm5kSmVYUmtkMGRJVjBscGRsYzFOVFJIVm1jNWRIaENNeXQwYTJscE9HNXBibWhQZUU5eVowdFpWRmQyYld4dlYzTlFRbE5WTkRKQkszVkNjbUl3TjBKWFRtSmpUbVl2VldWMFltVlhPRE5ZT1VWWlJGaFZVM0owVEVwUVdGZEtZV012ZG5Gck4zbFVkbVJNTkdwSVRIVm5ja2hHVmxsdFZDdFpTSFZpYnpWQ2JEaHZaMUZKZEhveldUSnFibEJQTTFwTmVqUTRWRGcyVTNwbFVETTNaRlZGYWpoUWFTOW1SbTQyVkhKSFNDOVVUWEptUmtVNE4yUk1NRU50WWt4Rk9ISm1SelYyVlVNMWIzQk1MMnRFVVRVM2VuTnFjMlZaUFNJc0ltMWhZeUk2SWpWak9EZG1ObVl6TkdSak5tTmtPRE15WkRVd05EUm1ZbU5oWkdOaU1tSTJNbVF5T1dWbVlXRTFaR0ppWTJRME1UVm1OV001TW1Wa1lUa3hOR1V3TkRjaUxDSjBZV2NpT2lJaWZRPT0=', 1758086337);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` enum('male','female','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `age` smallint UNSIGNED DEFAULT NULL,
  `height_cm` smallint UNSIGNED DEFAULT NULL,
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `dietary_goal` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fitness_goal` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `diet_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `allergies` json DEFAULT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_username_unique` (`username`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `first_name`, `last_name`, `username`, `gender`, `age`, `height_cm`, `weight_kg`, `dietary_goal`, `fitness_goal`, `diet_name`, `allergies`, `email`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`) VALUES
(1, 'Chahid', 'Abboud', NULL, 'male', 20, 190, 130.00, 'Calorie Deficit', 'Lose Weight', 'Mediterranean', '[\"Corn\", \"Celery\"]', 'shahidabboud2015@gmail.com', NULL, '$2y$12$.Krd8RQEAfM8eUK1fuzjaOfKbvNNlFnGQfUr5athgXr2wV/MdRruW', 'WJ7O2TK1fh88ZTo6tq5fH9aelaHDjkJQcNQCMR8nnQqlfNpA5LHwkJ1N90cs', '2025-09-13 12:24:24', '2025-09-13 12:24:24'),
(2, 'Keytel', 'Saadeh', 'k3ytel', 'male', 18, 183, 65.00, 'Calorie Surplus', 'Build Muscle', 'Mediterranean', '[\"Avocado\", \"Shellfish\", \"Corn\"]', 'imoelestppl@gmail.com', NULL, '$2y$12$kSHafLRnnfXpwIvjaaDTuedZzL7pYv1iinMLWpE0.GkKWKDK1bDxe', NULL, '2025-09-14 05:12:42', '2025-09-14 05:12:42'),
(3, 'Dany', 'Hatem', 'el_jahesh', 'male', 23, 187, 105.00, 'Calorie Deficit', 'Build Muscle', 'Mediterranean', '[\"Coconut\", \"Sulphites\"]', 'danyhatem2@gmail.com', NULL, '$2y$12$A2YTeA/R7hXE9kmL.u8ayumr3o0CtM1T8lgTUx0xdTYtoJC3CaYC.', NULL, '2025-09-14 11:33:03', '2025-09-14 11:33:03'),
(4, 'Dany', 'Hatem', NULL, NULL, 23, 188, 105.00, NULL, NULL, NULL, NULL, 'Danyhatem2002@gmail.com', NULL, '$2y$12$2riFHnM7E3HQgcijb4dwb.0B4kgWr/RgnWfLKelBMU7ZT8lOJRi2K', NULL, '2025-09-17 02:11:51', '2025-09-17 02:11:51');

-- --------------------------------------------------------

--
-- Table structure for table `user_diets`
--

DROP TABLE IF EXISTS `user_diets`;
CREATE TABLE IF NOT EXISTS `user_diets` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `diet_id` bigint UNSIGNED NOT NULL,
  `active_from` date DEFAULT NULL,
  `active_to` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_diets_diet_id_foreign` (`diet_id`),
  KEY `user_diets_user_id_diet_id_index` (`user_id`,`diet_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_diets`
--

INSERT INTO `user_diets` (`id`, `user_id`, `diet_id`, `active_from`, `active_to`, `created_at`, `updated_at`) VALUES
(1, 3, 1, '2025-09-14', NULL, '2025-09-14 12:19:30', '2025-09-14 12:19:30'),
(2, 3, 2, '2025-09-14', NULL, '2025-09-14 12:19:33', '2025-09-14 12:19:33'),
(3, 3, 3, '2025-09-14', NULL, '2025-09-14 12:21:27', '2025-09-14 12:21:27');

-- --------------------------------------------------------

--
-- Table structure for table `water_intakes`
--

DROP TABLE IF EXISTS `water_intakes`;
CREATE TABLE IF NOT EXISTS `water_intakes` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `day` date NOT NULL,
  `ml` int NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `water_intakes_user_id_day_unique` (`user_id`,`day`)
) ENGINE=MyISAM AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `water_intakes`
--

INSERT INTO `water_intakes` (`id`, `user_id`, `day`, `ml`, `created_at`, `updated_at`) VALUES
(1, 1, '2025-09-14', 5000, '2025-09-14 02:51:39', '2025-09-14 02:51:47'),
(2, 2, '2025-09-14', 2250, '2025-09-14 05:12:50', '2025-09-14 05:14:07'),
(3, 3, '2025-09-14', 3500, '2025-09-14 11:33:14', '2025-09-14 13:13:48'),
(4, 3, '2025-09-15', 44250, '2025-09-15 13:30:30', '2025-09-15 13:30:45');

-- --------------------------------------------------------

--
-- Table structure for table `workout_logs`
--

DROP TABLE IF EXISTS `workout_logs`;
CREATE TABLE IF NOT EXISTS `workout_logs` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `workout_date` date NOT NULL,
  `workout_plan_day_id` bigint UNSIGNED DEFAULT NULL,
  `duration_min` smallint UNSIGNED DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `workout_logs_workout_plan_day_id_foreign` (`workout_plan_day_id`),
  KEY `workout_logs_user_id_workout_date_index` (`user_id`,`workout_date`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `workout_logs`
--

INSERT INTO `workout_logs` (`id`, `user_id`, `workout_date`, `workout_plan_day_id`, `duration_min`, `notes`, `created_at`, `updated_at`) VALUES
(1, 1, '2025-09-15', NULL, NULL, NULL, '2025-09-15 12:36:52', '2025-09-15 12:36:52'),
(2, 1, '2025-09-15', NULL, NULL, NULL, '2025-09-15 12:38:01', '2025-09-15 12:38:01');

-- --------------------------------------------------------

--
-- Table structure for table `workout_log_sets`
--

DROP TABLE IF EXISTS `workout_log_sets`;
CREATE TABLE IF NOT EXISTS `workout_log_sets` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `workout_log_id` bigint UNSIGNED NOT NULL,
  `exercise_id` bigint UNSIGNED NOT NULL,
  `set_number` tinyint UNSIGNED NOT NULL,
  `weight_kg` decimal(6,2) DEFAULT NULL,
  `reps` tinyint UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workout_log_sets_workout_log_id_exercise_id_set_number_unique` (`workout_log_id`,`exercise_id`,`set_number`),
  KEY `workout_log_sets_exercise_id_foreign` (`exercise_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `workout_plans`
--

DROP TABLE IF EXISTS `workout_plans`;
CREATE TABLE IF NOT EXISTS `workout_plans` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'My Plan',
  `days_per_week` tinyint UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `workout_plans_user_id_foreign` (`user_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `workout_plan_days`
--

DROP TABLE IF EXISTS `workout_plan_days`;
CREATE TABLE IF NOT EXISTS `workout_plan_days` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `workout_plan_id` bigint UNSIGNED NOT NULL,
  `day_index` tinyint UNSIGNED NOT NULL,
  `title` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workout_plan_days_workout_plan_id_day_index_unique` (`workout_plan_id`,`day_index`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `workout_plan_day_exercise`
--

DROP TABLE IF EXISTS `workout_plan_day_exercise`;
CREATE TABLE IF NOT EXISTS `workout_plan_day_exercise` (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `workout_plan_day_id` bigint UNSIGNED NOT NULL,
  `exercise_id` bigint UNSIGNED NOT NULL,
  `target_sets` tinyint UNSIGNED NOT NULL DEFAULT '3',
  `target_reps` tinyint UNSIGNED NOT NULL DEFAULT '10',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `workout_plan_day_exercise_workout_plan_day_id_exercise_id_unique` (`workout_plan_day_id`,`exercise_id`),
  KEY `workout_plan_day_exercise_exercise_id_foreign` (`exercise_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
