<?php
// Устанавливаем заголовок, чтобы браузер знал, что это JSON
header('Content-Type: application/json; charset=utf-8');

// Директория, в которой лежат .md файлы.
// '.' означает текущую директорию (где лежит сам get_files.php).
// Если ваши .md файлы в подпапке, например, 'markdown_docs', измените это:
// $markdownDir = 'markdown_docs';
$markdownDir = 'markdown_files';

// Если хотите сканировать подпапку относительно директории, где лежит get_files.php:
// $basePath = __DIR__; // Абсолютный путь к директории скрипта
// $markdownDir = $basePath . DIRECTORY_SEPARATOR . 'markdown_files'; // Например, папка markdown_files

$files = [];
$iterator = new DirectoryIterator($markdownDir);

foreach ($iterator as $fileinfo) {
    if ($fileinfo->isFile() && strtolower($fileinfo->getExtension()) == 'md' && !str_starts_with($fileinfo->getFilename(), '._')) {
        // Добавляем только имя файла, т.к. JS будет запрашивать его по имени
        // относительно пути, указанного в JS (markdownFilesPath)
        $files[] = $fileinfo->getFilename();
    }
}

// Сортировка файлов (опционально, но обычно полезно)
// sort($files, SORT_NATURAL | SORT_FLAG_CASE); // Естественная сортировка с учетом регистра
sort($files); // Простая алфавитная сортировка

// Отдаем JSON с массивом имен файлов
echo json_encode($files);
?>