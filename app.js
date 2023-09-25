const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const dotenv = require('dotenv');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

dotenv.config();
// Configure as variáveis de ambiente com as informações de conexão ao banco de dados
const DATABASE_URL='mysql://mqj2f1qb55853lidgkk3:pscale_pw_kDHygdrqu8iGE131ch4aDMG5pWFVLDeqtzcyyA5yaxM@aws.connect.psdb.cloud/chat-bot?ssl={"rejectUnauthorized":true}'
// Configuração da conexão com o banco de dados
const connection = mysql.createConnection(DATABASE_URL);

// Teste de conexão com o banco de dados
connection.connect(err => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }
  console.log('Conexão com o banco de dados MySQL estabelecida');
});

// Rota POST para cadastrar usuário
app.post('/usuarios', (req, res) => {
  const novoUsuario = req.body;
  // Verificar se o e-mail já existe na tabela 'usuarios'
  connection.query('SELECT * FROM usuarios WHERE email = ?', novoUsuario.email, (err, results) => {
    if (err) {
      console.error('Erro ao verificar e-mail duplicado:', err);
      res.status(500).json({ error: 'Erro ao verificar e-mail duplicado' });
      return;
    }

    if (results.length > 0) {
      // O e-mail já está cadastrado, retornar um erro
      res.status(400).json({ error: 'E-mail já cadastrado' });
      return;
    }

    // Inserir o novo usuário no banco de dados, pois o e-mail é único
    connection.query('INSERT INTO usuarios SET ?', novoUsuario, (err, result) => {
      if (err) {
        console.error('Erro ao criar usuário:', err);
        res.status(500).json({ error: 'Erro ao criar usuário' });
        return;
      }
      novoUsuario.id = result.insertId;
      res.status(201).json(novoUsuario);
    });
  });
});


// Rota para retornar a pergunta com base no ID
app.get('/pergunta/:id', (req, res) => {
  const idPergunta = req.params.id;

  // Consultar o banco de dados para obter a pergunta com base no ID
  connection.query('SELECT mensagem FROM bot_perguntas WHERE id_pergunta = ?', idPergunta, (err, results) => {
    if (err) {
      console.error('Erro ao buscar pergunta:', err);
      res.status(500).json({ error: 'Erro ao buscar pergunta' });
      return;
    }

    if (results.length === 0) {
      // Se não houver correspondência para o ID, retornar uma mensagem de erro
      res.status(404).json({ error: 'Pergunta não encontrada' });
      return;
    }

    const pergunta = results[0].mensagem;
    res.json({ pergunta });
  });
});

//http://seusite.com/salas-disponiveis?dia=2023-09-25&horarioInicio=08:00&horarioFim=12:00&capacidade=20
// Rota para buscar salas disponíveis
app.get('/salas-disponiveis', (req, res) => {
  const { dia, horarioInicio, horarioFim, capacidade } = req.query;
  // Execute a consulta SQL no banco de dados com os parâmetros recebidos
  connection.query(
    'SELECT * FROM salas WHERE capacidade >= ? AND id_sala NOT IN (SELECT sala_id FROM reservas WHERE data_reserva = ? AND ((horario_inicio BETWEEN ? AND ?) OR (horario_fim BETWEEN ? AND ?)))',
    [capacidade, dia, horarioInicio, horarioFim, horarioInicio, horarioFim],
    (err, results) => {
      if (err) {
        console.error('Erro ao buscar salas disponíveis:', err);
        res.status(500).json({ error: 'Erro ao buscar salas disponíveis' });
        return;
      }
      res.json(results);
    }
  );
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
