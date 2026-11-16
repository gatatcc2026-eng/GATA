const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class DisciplinaMiddleware {

    /**
     * Valida a lista de professores: [{ registro, idTurma }, ...]
     * (aceita também o formato antigo "professor", só como número único)
     */
    #validarProfessores = (body, obrigatorio) => {

        const { professores, professor } = body;

        // formato antigo (compatibilidade): professor único
        if (!Array.isArray(professores) && professor !== undefined) {

            if (!Number.isInteger(Number(professor)) || Number(professor) <= 0) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "Professor deve ser um ID válido!"
                });
            }

            return;
        }

        if (professores === undefined) {

            if (obrigatorio) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "O campo 'professores' é obrigatório!"
                });
            }

            return;
        }

        if (!Array.isArray(professores) || professores.length === 0) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Selecione pelo menos um professor!"
            });
        }

        for (const vinculo of professores) {

            if (typeof vinculo !== "object" || vinculo === null) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "Cada professor deve conter registro e idTurma!"
                });
            }

            const registro = Number(vinculo.registro);
            const idTurma = Number(vinculo.idTurma);

            if (!Number.isInteger(registro) || registro <= 0) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "O registro do professor deve ser um número inteiro positivo!"
                });
            }

            if (!Number.isInteger(idTurma) || idTurma <= 0) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "O idTurma do professor deve ser um número inteiro positivo!"
                });
            }
        }
    };

    /**
     * Valida body (create) — exige todos os campos
     */
    validateBody = (req, res, next) => {
        console.log("🔷 DisciplinaMiddleware.validateBody()");
        const body = req.body;

        if (!body) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Body da requisição é obrigatório!"
            });
        }

        const { idDisciplina, nomeDisciplina } = body;

        // 🔹 CAMPOS OBRIGATÓRIOS (professores é validado à parte)
        const obrigatorios = ["idDisciplina", "nomeDisciplina"];
        for (const campo of obrigatorios) {
            if (body[campo] === undefined || body[campo] === null || body[campo].toString().trim() === "") {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: `O campo '${campo}' é obrigatório!`
                });
            }
        }

        // 🔹 ID
        if (!Number.isInteger(Number(idDisciplina)) || Number(idDisciplina) <= 0) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "idDisciplina deve ser um número inteiro positivo!"
            });
        }

        // 🔹 NOME
        if (typeof nomeDisciplina !== "string" || nomeDisciplina.trim().length < 3) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Nome da disciplina deve ter pelo menos 3 caracteres!"
            });
        }

        if (nomeDisciplina.trim().length > 100) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Nome da disciplina não pode ultrapassar 100 caracteres!"
            });
        }

        // 🔹 PROFESSORES (obrigatório)
        this.#validarProfessores(body, true);

        next();
    };

    /**
     * Valida body para UPDATE (PUT) — campos opcionais.
     */
    validateUpdateBody = (req, res, next) => {
        console.log("🔷 DisciplinaMiddleware.validateUpdateBody()");
        const body = req.body;

        if (!body || Object.keys(body).length === 0) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Body da requisição é obrigatório e não pode estar vazio!"
            });
        }

        const { nomeDisciplina } = body;

        // 🔹 NOME (só valida se foi enviado)
        if (nomeDisciplina !== undefined) {
            if (typeof nomeDisciplina !== "string" || nomeDisciplina.trim().length < 3) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "Nome da disciplina deve ter pelo menos 3 caracteres!"
                });
            }

            if (nomeDisciplina.trim().length > 100) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "Nome da disciplina não pode ultrapassar 100 caracteres!"
                });
            }
        }

        // 🔹 PROFESSORES (só valida se foi enviado)
        this.#validarProfessores(body, false);

        next();
    };

    /**
     * Valida parâmetro idDisciplina
     */
    validateIdParam = (req, res, next) => {
        console.log("🔷 DisciplinaMiddleware.validateIdParam()");
        const { idDisciplina } = req.params;

        if (!idDisciplina || isNaN(Number(idDisciplina)) || Number(idDisciplina) <= 0) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Parâmetro 'idDisciplina' deve ser um número inteiro positivo!"
            });
        }

        next();
    };
};