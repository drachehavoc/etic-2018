<?php

error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");

$conexao = require('pdo.php');

try{
        
    $order = "ORDER BY nome";
    
    $id = (isset($_GET['id'])) 
        ? $_GET['id']
        : 0;

    if (isset($_GET['no-order']) && $_GET['no-order'] == 1)
        $order = "";

	$query = $conexao->prepare("SELECT idusuario as id, LPAD(idusuario, 5, '0') as codigo, nome FROM usuario WHERE idusuario >= ? {$order} LIMIT 10000");
	$query->bindParam(1, $id);
	$query->execute();
	$response = $query->fetchAll(PDO::FETCH_ASSOC);
	if($query->rowCount() > 0){
		die(json_encode($response));
	}else{
		die(json_encode(['erro'=>500, 'linha'=> __LINE__]));
	}
}catch(Exception $e){
	die("Erro" . $e->getMessage());
}