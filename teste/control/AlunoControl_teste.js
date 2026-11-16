const AlunoControl = require("../../control/AlunoControl");
const AlunoService = require("../../service/AlunoService");
const AlunoDAO = require("../../dao/AlunoDAO");
const MysqlDatabase = require("../../database/MysqlDatabase");

const banco = new MysqlDatabase({});
const alunoDAO = new AlunoDAO(banco);
const alunoService = new AlunoService(alunoDAO);
const alunoControl = new AlunoControl(alunoService);

// MOCK de req e res
const req = {
    body: {
        matricula: 12345678,
        nome: "João",
        email: "joao@gmail.com",
        senha: "12345678",
        telefone: "12999999999",
        curso: 1,
        turma: 1,
        ano: 2025
    }
};

const res = {
    status: (code) => {
        console.log("STATUS:", code);
        return {
            json: (data) => console.log("RESPOSTA:", data)
        };
    }
};


alunoControl.store(req, res);