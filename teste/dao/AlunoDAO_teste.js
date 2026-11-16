
const Aluno = require("../../model/Aluno");

const AlunoService = require("../../service/AlunoService");

const AlunoDAO = require("../../dao/AlunoDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");

const config = {}
const banco = new MysqlDatabase(config);
const alunoDAO = new AlunoDAO(banco);

const aluno = new Aluno();

aluno.nome = "ana";
aluno.email = "hdgfhdh@gmail.com";
aluno.senha = "12345678";
aluno.telefone = "12996396575";
aluno.idCurso = "1";
aluno.idTurma = "1";
aluno.ano = "2025";
aluno.matricula = "2";


alunoDAO.delete(aluno)
