

const Turma = require("../../model/Turma");

const TurmaDAO = require("../../dao/TurmaDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");


const config = {}
const banco = new MysqlDatabase(config);
const turmaDAO = new TurmaDAO(banco);
const turma = new Turma(turmaDAO);

turma.nomeTurma = "3F Fãs do Ricardinho!!!";
turma.idTurma = "2";


turmaDAO.delete(turma);

//node TurmaDAO_teste.js