#!/usr/bin/env php
<?php

declare(strict_types=1);

use Pest\Kernel;
use Pest\Panic;
use Pest\TestSuite;
use Symfony\Component\Console\Input\ArgvInput;
use Symfony\Component\Console\Output\ConsoleOutput;

require __DIR__.'/../vendor/autoload.php';

$_SERVER['COLLISION_PRINTER'] = 'DefaultPrinter';

$originalArguments = $_SERVER['argv'];
$arguments = $originalArguments;

foreach ($arguments as $key => $value) {
    if ($value === '--compact') {
        $_SERVER['COLLISION_PRINTER_COMPACT'] = 'true';
        unset($arguments[$key]);
    }

    if ($value === '--profile') {
        $_SERVER['COLLISION_PRINTER_PROFILE'] = 'true';
        unset($arguments[$key]);
    }
}

$cwd = getcwd();
$rootPath = is_string($cwd) && $cwd !== ''
    ? $cwd
    : dirname(__DIR__);

if (! is_string($rootPath) || $rootPath === '') {
    fwrite(STDERR, "Unable to resolve the project root for Pest.\n");

    exit(1);
}

$input = new ArgvInput;
$testDirectory = (string) $input->getParameterOption('--test-directory', 'tests');
$testSuite = TestSuite::getInstance($rootPath, ltrim($testDirectory, '\\/'));

$isDecorated = $input->getParameterOption('--colors', 'always') !== 'never';
$output = new ConsoleOutput(ConsoleOutput::VERBOSITY_NORMAL, $isDecorated);

try {
    $kernel = Kernel::boot($testSuite, $input, $output);
    $result = $kernel->handle($originalArguments, $arguments);
    $kernel->terminate();
} catch (Throwable|Error $e) {
    Panic::with($e);
}

exit($result);
