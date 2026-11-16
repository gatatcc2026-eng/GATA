const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class CursoMiddleware {

    /**
     * Valida o corpo da requisição para criação/atualização de curso
     * 
     * Regras:
     * - Deve existir "nomeCurso"
     * - Deve ser string
     * - Mínimo 3 caracteres
     */
    validateBody = (req, res, next) => {
        console.log("🔷 CursoMiddleware.validateBody()");
        const body = req.body;

        if (!body) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Body da requisição é obrigatório!"
            });
        }

        const { nomeCurso } = body;

        if (nomeCurso === undefined || nomeCurso === null || nomeCurso.toString().trim() === "") {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "O campo 'nomeCurso' é obrigatório!"
            });
        }

        if (typeof nomeCurso !== "string") {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "O campo 'nomeCurso' deve ser uma string!"
            });
        }

        const nomeTratado = nomeCurso.trim();

        if (nomeTratado.length < 3) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "O nome do curso deve ter pelo menos 3 caracteres!"
            });
        }

        if (nomeTratado.length > 100) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "O nome do curso não pode ultrapassar 100 caracteres!"
            });
        }

        next();
    };

    /**
     * Valida o parâmetro idCurso da rota
     */
    validateIdParam = (req, res, next) => {
        console.log("🔷 CursoMiddleware.validateIdParam()");
        const { idCurso } = req.params;

        if (!idCurso || isNaN(Number(idCurso)) || Number(idCurso) <= 0) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "O parâmetro 'idCurso' deve ser um número inteiro positivo!"
            });
        }

        next();
    };
};