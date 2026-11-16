const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class TurmaMiddleware {

    /**
     * Valida o body da requisição (create/update)
     * 
     * Regras:
     * - nomeTurma obrigatório
     * - string
     * - mínimo 2 caracteres
     */
    validateBody = (req, res, next) => {
        console.log("🔷 TurmaMiddleware.validateBody()");
        const body = req.body;

        if (!body) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Body da requisição é obrigatório!"
            });
        }

        const { nomeTurma } = body;

        if (nomeTurma === undefined || nomeTurma === null || nomeTurma.toString().trim() === "") {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "O campo 'nomeTurma' é obrigatório!"
            });
        }

        if (typeof nomeTurma !== "string") {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "O campo 'nomeTurma' deve ser uma string!"
            });
        }

        const nomeTratado = nomeTurma.trim();

        if (nomeTratado.length < 2) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "O nome da turma deve ter pelo menos 2 caracteres!"
            });
        }

        if (nomeTratado.length > 100) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "O nome da turma não pode ultrapassar 100 caracteres!"
            });
        }

        next();
    };

    /**
     * Valida o parâmetro idTurma
     */
    validateIdParam = (req, res, next) => {
        console.log("🔷 TurmaMiddleware.validateIdParam()");
        const { idTurma } = req.params;

        if (!idTurma || isNaN(Number(idTurma)) || Number(idTurma) <= 0) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "O parâmetro 'idTurma' deve ser um número inteiro positivo!"
            });
        }

        next();
    };
};