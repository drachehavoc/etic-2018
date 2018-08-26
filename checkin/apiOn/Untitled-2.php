<?php

header("Access-Control-Allow-Origin: *");

// ConexÃ£o PDO
$conexao = new PDO('mysql:host=localhost;dbname=etic2018;charset=utf8','etic','ifc#tic@753', [PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION]);



switch($_GET['option']){

    // Devolve todos os inscritos de uma atividade X recebendo o ID dessa atividade

    case "carregarInscritos":
        try{
            $capacidade = $conexao->prepare("SELECT capacidade from atividade where idatividade = ?");
            $capacidade->bindParam(1, $_GET['id'], PDO::PARAM_STR);
            $capacidade->execute();
            $capacidade = $capacidade->fetch(PDO::FETCH_ASSOC);


            $conexao->exec("SET @row_num = 0");
            $query = $conexao->prepare("SELECT * FROM (SELECT @row_num := @row_num+1 AS num, @row_num>{$capacidade['capacidade']} AS espera, u.idusuario as id, u.nome FROM usuario AS u INNER JOIN usuario_atividade as ua ON u.idusuario = ua.idusuario WHERE ua.idatividade = ?) AS x ORDER BY espera, nome");
            
            $query->bindParam(1, $_GET['id'], PDO::PARAM_STR);
            $query->execute();
            
            $response = [];

            while($row = $query->fetch(PDO::FETCH_ASSOC)){
                $presenca = $conexao->prepare("SELECT UNIX_TIMESTAMP (ua.presenca) as presenca FROM usuario_atividade as ua where ua.idusuario =". $row['id'] . " AND ua.idatividade =" . $_GET['id']);
                $presenca->execute();
                $presenca = $presenca->fetch(PDO::FETCH_ASSOC);
                $row['presenca'] = $presenca['presenca'];
                array_push($response, $row);
            }

            if($query->rowCount() > 0)
                die( json_encode($response) );
            else
                die("O ID enviado nÃ£o estÃ¡ cadastrado ou nÃ£o possui usuÃ¡rios inscritos"); 
                            
        }catch(PDOException $e){
            die("Erro" . $e->getMessage());
        }
    break;

    // Retorna todos os inscritos de todas as atividades cadastradas ordenados por ordem alfabÃ©tica da atividade e pela hora de inscriÃ§Ã£o do usuÃ¡rio

    case "carregarInscritosGeral":
        try{
            
            $query = $conexao->prepare("SELECT u.idusuario as id, u.nome, ua.presenca, a.titulo as nome_atividade FROM usuario AS u INNER JOIN usuario_atividade as ua ON u.idusuario = ua.idusuario INNER JOIN atividade as a ON a.idatividade = ua.idatividade ORDER BY a.titulo, ua.hora_inscricao");
            $query->execute();
            $response = $query->fetchAll(PDO::FETCH_ASSOC);

            if($query->rowCount() > 0){
                echo json_encode($response);
                die;
            }else{
                die("O ID enviado nÃ£o estÃ¡ cadastrado ou nÃ£o possui usuÃ¡rios inscritos");
            }
                
        }catch(PDOException $e){
            die("Erro" . $e->getMessage());
        }
    break;

    // Retorna informaÃ§Ãµes de uma atividade, recebe um parametro $_GET['id'] para identificar a atividade

    case "carregarAtividadeUnica":
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
    break;

    // Retorna informaÃ§Ãµes de todas as atividades cadastradas

    case "carregarTodasAtividades":
        try{
            $query = $conexao->prepare("SELECT a.idatividade as id, a.titulo as nome, c.valor as eticoin FROM atividade AS a INNER JOIN categoria as c ON a.idcategoria = c.idcategoria  AND hora_inicio > NOW() order by hora_inicio");
            $query->execute();
            $response = $query->fetchAll(PDO::FETCH_ASSOC);

            if($query->rowCount() > 0){
                echo json_encode($response);
                die;
            }else{
                die("O ID enviado nÃ£o estÃ¡ cadastrado ou nÃ£o possui usuÃ¡rios inscritos");
            }
                
        }catch(PDOException $e){
            die("Erro" . $e->getMessage());
        }
    break;

    // Retorna todos os usuÃ¡rios cadastrados
    
    case "carregarUsuarios":
        try{
            $query = $conexao->prepare("SELECT idusuario, nome, email FROM usuario");
            $query->execute();
            $response = $query->fetchAll(PDO::FETCH_ASSOC);

            if($query->rowCount() > 0){
                echo json_encode($response);
                die;
            }else{
                die("O ID enviado nÃ£o estÃ¡ cadastrado ou nÃ£o possui usuÃ¡rios inscritos");
            }
                
        }catch(PDOException $e){
            die("Erro" . $e->getMessage());
        }
    break;

    // Retorna os eticoins de um usuÃ¡rio, caso o usuÃ¡rio nÃ£o possua nenhum faz uma nova query e retorna apenas seus dados. Recebe por param $_GET['id']

    case "carregarEticoins":
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
    break;

    // Retorna os 5 usuÃ¡rios com o maior nÃºmeros de eticoins

    case "carregarEticoinsGeral":
        try{
            $query = $conexao->prepare("SELECT u.idusuario, u.nome,sum(c.valor) as eticoins FROM usuario u
                INNER JOIN usuario_atividade ua
                ON ua.idusuario = u.idusuario
                INNER JOIN atividade a
                ON a.idatividade=ua.idatividade
                INNER JOIN categoria c
                ON c.idcategoria=a.idcategoria
                WHERE ua.presenca>0
                GROUP BY u.idusuario
                ORDER BY eticoins DESC LIMIT 5;");
            $query->execute();
            $response = $query->fetchAll(PDO::FETCH_ASSOC);
            if($query->rowCount() > 0){
                die(json_encode($response));
            }else{
                die(json_encode([
                    'idusuario'=>$response['idusuario'],
                    'nome'=>$response['nome'],
                    'eticoins'=>0
                    ]));
            }
        }catch(PDOException $e){
            die("Erro" . $e->getMessage());
        }
    break;

    // Retona todos os inscritos com um LPAD no seu ID para formar os crachÃ¡s

    case "carregarTodosInscritos":
        try{
            if(!isset($_GET['id']))
                $param = 0;
            else
                $param = $_GET['id'];

            if(!isset($_GET['idmax']))
                $param2 = 10000;
            else
                $param2 = $_GET['idmax'];

            $query = $conexao->prepare("SELECT idusuario as id, LPAD(idusuario, 5, '0') as codigo, nome FROM usuario WHERE idusuario > ? ORDER BY nome LIMIT ". $param2);
            $query->bindParam(1, $param);
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
    break;

    // Retorna as presenÃ§as por tuma 

    case "presencaPorTurma":
        try{
            $query = $conexao->prepare("SELECT u.nome,a.titulo,a.hora_inicio FROM usuario u
            INNER JOIN usuario_atividade ua
            ON ua.idusuario=u.idusuario
            INNER JOIN atividade a
            ON a.idatividade=ua.idatividade
            WHERE ua.presenca>0 AND u.turma LIKE '%?%' ORDER BY u.nome;");
            $query->bindParam(1,$_GET['turma'],PDO::PARAM_STR);
            $query->execute();
            $response = $query->fetchAll(PDO::FETCH_ASSOC);
            if($query->rowCount() > 0){
                die(json_encode($response));
            }else{
                die(json_encode(['erro'=>500]));
            }
        }catch(PDOException $e){
            die("Erro" . $e->getMessage());
        }
    break;

    // Verifica se o usuÃ¡rio possui eticoins o suficiente para gastar, caso verdadeiro adiciona o param $_GET['id'] no campo gasto do usuÃ¡rio
    // Recebe $_GET['id'] e $_GET['gasto'] 

    case "gastarEticoins":
        try{
            $query = $conexao->prepare("SELECT u.gasto, sum(c.valor) as eticoins FROM usuario u
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
            if(intval($response['eticoins'])-intval($response['gasto']) < intval($_GET['gasto'])){
                die('Eticoins insuficientes');
            }
            $query = $conexao->prepare("UPDATE usuario
            SET gasto = gasto + ?
            WHERE idusuario = ?");
            $query->bindParam(1,$_GET['gasto'],PDO::PARAM_INT);
            $query->bindParam(2,$_GET['id'],PDO::PARAM_INT);
            $query->execute();
            $response = $query->fetchAll(PDO::FETCH_ASSOC);
            if($query->rowCount() > 0){
                die(json_encode(["saldo"=>$response['eticoins'] - $response ['gasto']]));
            }else{
                die(json_encode(['erro'=>500]));
            }
        }catch(PDOException $e){
            die("Erro" . $e->getMessage());
        }
    break;

    // Tenta registrar a presenÃ§a de um QR code ou ID, caso o usuÃ¡rio nÃ£o esteja inscrito nÃ£o demostra mensagem de erro

    case "registrarPresencas":
        try{
            $data = json_decode(file_get_contents('php://input'), true);

            for ($i=0; $i < count($data['usuarios']); $i++) {     
                $query = $conexao->prepare("UPDATE usuario_atividade SET presenca = CURRENT_TIMESTAMP WHERE idusuario = ? AND idatividade = ?");            
                $query->bindParam(1, $data['usuarios'][$i],PDO::PARAM_INT);
                $query->bindParam(2, $data['id'],PDO::PARAM_INT);
                $query->execute();
            }

            die(json_encode(['status'=>200]));

        }catch(PDOException $e){
            die(json_encode(['status'=>400,'msg'=>$e->getMessage()]));
        }
    break;

    // Tenta registrar a presenÃ§a de um QR code ou ID, caso o usuÃ¡rio nÃ£o esteja inscrito nÃ£o demostra mensagem de erro e inscreve o usuÃ¡rio na atividade alÃ©m de registrar sua presenÃ§a

    case "registrarPresencasPermissiva":
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
    break;

    // Retorna o maior gasto de eticoins do evento

    case "maiorGastoEticoins":
        try{
            $query = $conexao->prepare("SELECT nome, email, gasto from usuario order by gasto desc limit 10");            
            $query->execute();
            $response = $query->fetch(PDO::FETCH_ASSOC);
            die(json_encode($response));

        }catch(PDOException $e){
            die(json_encode(['status'=>400,'msg'=>$e->getMessage()]));
        }
    break;
}