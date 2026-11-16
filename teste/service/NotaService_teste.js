const NotaService = require("../../service/NotaService");
const NotaDAO = require("../../dao/NotaDAO");
const MysqlDatabase = require("../../database/MysqlDatabase");

config = {}
const banco = new MysqlDatabase(config);
const notaDAO = new NotaDAO(banco);
const notaService = new NotaService(notaDAO);

const jsonNotaTeste = {
    idNota: 3,
    nota: 2,
    bimestre:  "3bimestre",
    idAlunoDisciplinaProfessor: 1
};
notaService.delete(jsonNotaTeste.idNota);
//node NotaService_teste.js