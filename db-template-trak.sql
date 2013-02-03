-- phpMyAdmin SQL Dump
-- version 3.1.1
-- http://www.phpmyadmin.net
--
-- Host: localhost
-- Generation Time: Dec 05, 2012 at 08:31 PM
-- Server version: 5.1.30
-- PHP Version: 5.2.8

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `trak`
--

-- --------------------------------------------------------

--
-- Table structure for table `mau_activehx`
--

DROP TABLE IF EXISTS `mau_activehx`;
CREATE TABLE IF NOT EXISTS `mau_activehx` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `patient` int(11) NOT NULL,
  `cond` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `patient` (`patient`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `mau_data`
--

DROP TABLE IF EXISTS `mau_data`;
CREATE TABLE IF NOT EXISTS `mau_data` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `patient` int(11) NOT NULL,
  `visitid` int(11) NOT NULL,
  `disc` text NOT NULL,
  `rec` text NOT NULL,
  `pc` text NOT NULL,
  `wd` text NOT NULL,
  `plan` text NOT NULL,
  `jobs` text NOT NULL,
  `SBARr` text NOT NULL,
  `SBARs` text NOT NULL,
  `SBARb` text NOT NULL,
  `dv` tinyint(1) NOT NULL,
  `bn` tinyint(1) NOT NULL,
  `handovertxt` text NOT NULL,
  `gpadv` text NOT NULL,
  `patadv` text NOT NULL,
  `ccom` text NOT NULL,
  `rxchange` tinyint(1) NOT NULL,
  `followup` tinyint(1) NOT NULL,
  `nldcrit1` varchar(32) NOT NULL,
  `nldcrit2` varchar(32) NOT NULL,
  `nldcrit3` varchar(32) NOT NULL,
  `nldcrit4` varchar(32) NOT NULL,
  `nldcrit5` varchar(32) NOT NULL,
  `nldcrit6` varchar(32) NOT NULL,
  `nldcrityn1` tinyint(1) NOT NULL,
  `nldcrityn2` tinyint(1) NOT NULL,
  `nldcrityn3` tinyint(1) NOT NULL,
  `nldcrityn4` tinyint(1) NOT NULL,
  `nldcrityn5` tinyint(1) NOT NULL,
  `nldcrityn6` tinyint(1) NOT NULL,
  `scs` varchar(64) NOT NULL,
  KEY `id` (`id`),
  KEY `pid` (`patient`),
  KEY `vid` (`visitid`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC;

-- --------------------------------------------------------

--
-- Table structure for table `mau_events`
--

DROP TABLE IF EXISTS `mau_events`;
CREATE TABLE IF NOT EXISTS `mau_events` (
  `id` mediumint(9) NOT NULL AUTO_INCREMENT,
  `event_end` datetime NOT NULL,
  `event_text` text NOT NULL,
  `event_location` varchar(64) NOT NULL,
  `type` mediumint(9) NOT NULL,
  `event_porter` tinyint(4) NOT NULL DEFAULT '2',
  `event_start` datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  `pID` int(11) NOT NULL,
  `vID` int(11) NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT '1',
  `event_desc` text NOT NULL,
  `event_result` text NOT NULL,
  `event_data` text NOT NULL,
  `extras` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id` (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 ROW_FORMAT=DYNAMIC;

-- --------------------------------------------------------

--
-- Table structure for table `mau_han`
--

DROP TABLE IF EXISTS `mau_han`;
CREATE TABLE IF NOT EXISTS `mau_han` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `visitid` int(11) NOT NULL,
  `hx` text NOT NULL,
  `req` text NOT NULL,
  `outcome` text NOT NULL,
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ftime` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `expires` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `due` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`),
  KEY `visitid` (`visitid`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `mau_note`
--

DROP TABLE IF EXISTS `mau_note`;
CREATE TABLE IF NOT EXISTS `mau_note` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` int(11) NOT NULL,
  `visitid` int(11) NOT NULL,
  `refid` int(11) NOT NULL,
  `author` varchar(64) NOT NULL,
  `bleep` varchar(16) NOT NULL,
  `role` tinyint(4) NOT NULL,
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `note` text NOT NULL,
  `data` blob NOT NULL,
  PRIMARY KEY (`id`),
  KEY `visitid` (`visitid`),
  KEY `refid` (`refid`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `mau_patient`
--

DROP TABLE IF EXISTS `mau_patient`;
CREATE TABLE IF NOT EXISTS `mau_patient` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pas` int(11) NOT NULL,
  `name` varchar(64) NOT NULL,
  `dob` date NOT NULL,
  `gender` tinyint(1) NOT NULL DEFAULT '1',
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `hide` tinyint(1) NOT NULL DEFAULT '0',
  `dnar` tinyint(1) NOT NULL,
  `paddr` text NOT NULL,
  `gpname` varchar(64) NOT NULL,
  `gpaddr` text NOT NULL,
  `nhs` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pas` (`pas`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `mau_pmhx`
--

DROP TABLE IF EXISTS `mau_pmhx`;
CREATE TABLE IF NOT EXISTS `mau_pmhx` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `patient` int(11) NOT NULL,
  `cond` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `patient` (`patient`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `mau_referral`
--

DROP TABLE IF EXISTS `mau_referral`;
CREATE TABLE IF NOT EXISTS `mau_referral` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `visitid` int(11) NOT NULL,
  `who` tinyint(4) NOT NULL,
  `status` tinyint(4) NOT NULL,
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `stime` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `rtime` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `dtime` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`),
  KEY `visitid` (`visitid`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `mau_rx`
--

DROP TABLE IF EXISTS `mau_rx`;
CREATE TABLE IF NOT EXISTS `mau_rx` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `patient` int(11) NOT NULL,
  `drug` int(11) NOT NULL,
  `dose` int(11) NOT NULL,
  `give` tinyint(1) NOT NULL DEFAULT '1',
  `ac` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `patient` (`patient`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `mau_visit`
--

DROP TABLE IF EXISTS `mau_visit`;
CREATE TABLE IF NOT EXISTS `mau_visit` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `patient` int(11) NOT NULL,
  `site` tinyint(4) NOT NULL,
  `ward` tinyint(4) NOT NULL,
  `bed` tinyint(4) NOT NULL,
  `dsite` tinyint(4) NOT NULL,
  `dward` tinyint(4) NOT NULL,
  `dbed` tinyint(4) NOT NULL,
  `triage` tinyint(4) NOT NULL,
  `ews` tinyint(4) NOT NULL,
  `reg` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `admitdate` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `dischdate` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `status` tinyint(4) NOT NULL,
  `source` tinyint(4) NOT NULL,
  `edd` date NOT NULL,
  `acdd` date NOT NULL,
  `ctime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `alert` text NOT NULL,
  `consmau` tinyint(4) NOT NULL,
  `consoc` tinyint(4) NOT NULL,
  `sugward` tinyint(4) NOT NULL,
  `nld` tinyint(1) NOT NULL,
  `nldok` tinyint(1) NOT NULL,
  `board` tinyint(4) NOT NULL,
  `frailty` tinyint(4) NOT NULL,
  `mobility` tinyint(4) NOT NULL,
  `eotbt` tinyint(4) NOT NULL,
  `pathway` tinyint(4) NOT NULL,
  `handover` tinyint(4) NOT NULL,
  `handate` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `nvwrdate` date NOT NULL,
  `ddest` tinyint(4) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `patient` (`patient`),
  KEY `site` (`site`),
  KEY `ward` (`ward`),
  KEY `dsite` (`dsite`),
  KEY `dward` (`dward`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `med_activehx`
--

DROP TABLE IF EXISTS `med_activehx`;
CREATE TABLE IF NOT EXISTS `med_activehx` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `comorb` varchar(64) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `comorb` (`comorb`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `med_pmhx`
--

DROP TABLE IF EXISTS `med_pmhx`;
CREATE TABLE IF NOT EXISTS `med_pmhx` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `comorb` varchar(64) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `comorb` (`comorb`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `rx_dose`
--

DROP TABLE IF EXISTS `rx_dose`;
CREATE TABLE IF NOT EXISTS `rx_dose` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `drugid` int(11) NOT NULL,
  `str` varchar(10) NOT NULL,
  `dose` tinyint(4) NOT NULL,
  `units` tinyint(4) NOT NULL,
  `time` tinyint(4) NOT NULL,
  `freq` tinyint(4) NOT NULL,
  `route` tinyint(4) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `drugid` (`drugid`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Table structure for table `rx_drug`
--

DROP TABLE IF EXISTS `rx_drug`;
CREATE TABLE IF NOT EXISTS `rx_drug` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `cd` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `name` (`name`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8;
