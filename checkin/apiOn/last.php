<?php

error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");

$conexao = require('pdo.php');

try{
    $query = $conexao->prepare("SELECT max(idusuario) as mx FROM usuario");
	$query->execute();
	$response = $query->fetch(PDO::FETCH_ASSOC);
	if($query->rowCount() > 0){
		die(json_encode((int)$response['mx']));
	}else{
		die(json_encode(['erro'=>500, 'linha'=> __LINE__]));
	}
}catch(Exception $e){
	die("Erro" . $e->getMessage());
}