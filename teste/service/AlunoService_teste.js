const Aluno = require("../../model/Aluno");

const AlunoService = require("../../service/AlunoService");

const AlunoDAO = require("../../dao/AlunoDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");

const config = {}
const banco = new MysqlDatabase(config);
const alunoDAO = new AlunoDAO(banco);

const alunoService = new AlunoService(alunoDAO);

const jsonAlunoTeste= {
    matricula: 50240663,
    nome: "João Vitor",
    email: "joaozinhoooo@gmail.com",
    senha: "12345678",
    telefone: "12996729470",
    curso: 1,
    turma: 1,
    ano: 2026
}

alunoService.updateAluno(jsonAlunoTeste);
