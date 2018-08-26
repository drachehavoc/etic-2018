<?php

header("Access-Control-Allow-Origin: *");

$conexao = require('pdo.php');

try{
    $data = json_decode(file_get_contents('php://input'), true);

    for ($i=0; $i < count($data['usuarios']); $i++) {     
        $query = $conexao->prepare("UPDATE usuario_atividade SET presenca = CURRENT_TIMESTAMP WHERE idusuario = ? AND idatividade = ?");            
        $query->bindParam(1, $data['usuarios'][$i],PDO::PARAM_INT);
        $query->bindParam(2, $data['id'],PDO::PARAM_INT);
        $query->execute();

        if($query->rowCount() == 0){
            $query = $conexao->prepare("INSERT INTO usuario_atividade (idusuario, idatividade, hora_inscricao, presenca, forasteiro) VALUES (?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP, 1)");            
            $query->bindParam(1, $data['usuarios'][$i],PDO::PARAM_INT);
            $query->bindParam(2, $data['id'],PDO::PARAM_INT);
            $query->execute();
        }
    }

    die(json_encode(['status'=>200]));

}catch(PDOException $e){
    die(json_encode(['status'=>400,'msg'=>$e->getMessage()]));
}