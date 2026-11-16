console.log("ola mundo")

const Nota = require("../../model/Nota");

const NotaService = require("../../service/NotaService");

const NotaDAO = require("../../dao/NotaDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");

const config = {}
const banco = new MysqlDatabase(config);
const notaDAO = new NotaDAO(banco);

const nota = new Nota();
nota.idNota = 2;
nota.nota = "3.7";
nota.bimestre = "1";
nota.idAlunoDisciplinaProfessor = 1;


notaDAO.create(nota);