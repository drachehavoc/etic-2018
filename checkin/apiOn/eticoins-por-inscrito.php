<?php

header("Access-Control-Allow-Origin: *");

$conexao = require('pdo.php');

try{
    $query = $conexao->prepare("SELECT u.idusuario, u.nome, u.gasto,sum(c.valor) as eticoins FROM usuario u
        INNER JOIN usuario_atividade ua
        ON ua.idusuario = u.idusuario
        INNER JOIN atividade a
        ON a.idatividade=ua.idatividade
        INNER JOIN categoria c
        ON c.idcategoria=a.idcategoria
        WHERE ua.presenca > 0 AND u.idusuario=?
        GROUP BY u.idusuario;");
    $query->bindParam(1,$_GET['id'],PDO::PARAM_INT);
    $query->execute();
    $response = $query->fetch(PDO::FETCH_ASSOC);
    if($query->rowCount() > 0){
        die(json_encode([
            'idusuario'=>$response['idusuario'],
            'nome'=>$response['nome'],
            'eticoinsTotais'=>intval($response['eticoins']),
            'eticoinsGastos'=>intval($response['gasto'])
        ]));
    }else{
        $query = $conexao->prepare("SELECT idusuario, nome FROM usuario WHERE idusuario=?");
        $query->bindParam(1,$_GET['id'],PDO::PARAM_INT);
        $query->execute();
        $response = $query->fetch(PDO::FETCH_ASSOC);
        die(json_encode([
            'idusuario'=>$response['idusuario'],
            'nome'=>$response['nome'],
            'eticoinsTotais'=>0,
            'eticoinsGastos'=>0
        ]));
    }
}catch(PDOException $e){
    die("Erro" . $e->getMessage());
}