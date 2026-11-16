const Turma = require("../../model/Turma");

const TurmaService = require("../../service/TurmaService");

const TurmaDAO = require("../../dao/TurmaDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");

const config = {}
const banco = new MysqlDatabase(config);
const turmaDAO = new TurmaDAO(banco);

const turmaService = new TurmaService(turmaDAO);

const jsonTurmaTeste= {
    nomeTurma: "3F",
    idTurma: 2
}

turmaService.findById(jsonTurmaTeste.idTurma);
//node TurmaService_teste.js