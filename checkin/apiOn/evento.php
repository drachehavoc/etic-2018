<?php

header("Access-Control-Allow-Origin: *");

$conexao = require('pdo.php');

try{
	$query = $conexao->prepare("SELECT a.idatividade, a.titulo as nome, c.valor as eticoin FROM atividade AS a INNER JOIN categoria as c ON a.idcategoria = c.idcategoria WHERE a.idatividade = ?");

	$query->bindParam(1, $_GET['id'], PDO::PARAM_STR);
	$query->execute();
	$response = $query->fetch(PDO::FETCH_ASSOC);

	if($query->rowCount() > 0){
		echo json_encode($response);
		die;
	}else{
		die("O ID enviado nÃ£o estÃ¡ cadastrado ou nÃ£o possui usuÃ¡rios inscritos");
	}
		
}catch(PDOException $e){
	die("Erro" . $e->getMessage());
}