<?php
date_default_timezone_set('America/Sao_Paulo');

// echo json_encode([
// 	"y" => 2018,
// 	"m" => 1,
// 	"d" => 1,
// 	"h" => 1,
// 	"i" => 1,
// 	"s" => 1
// ]);

$d = new DateTime();

echo json_encode([
	"y" => (integer)$d->format("Y"),
	"m" => (integer)$d->format("m"),
	"d" => (integer)$d->format("d"),
	"h" => (integer)$d->format("H"),
	"i" => (integer)$d->format("i"),
	"s" => (integer)$d->format("s")
]);