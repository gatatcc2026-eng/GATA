const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class ProfessorMiddleware {

    /**
     * Valida body (create/update)
     */
    validateBody = (req, res, next) => {
        console.log("🔷 ProfessorMiddleware.validateBody()");
        const body = req.body;

        if (!body) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Body da requisição é obrigatório!"
            });
        }

        const {
            registro,
            nome,
            senha,
            telefone1,
            telefone2,
            email1,
            email2
        } = body;

        // 🔹 CAMPOS OBRIGATÓRIOS
        const obrigatorios = ["registro", "nome", "senha", "telefone1", "email1"];
        for (const campo of obrigatorios) {
            if (body[campo] === undefined || body[campo] === null || body[campo].toString().trim() === "") {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: `O campo '${campo}' é obrigatório!`
                });
            }
        }

        // 🔹 REGISTRO
        if (isNaN(Number(registro)) || Number(registro) <= 0) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Registro deve ser um número inteiro positivo!"
            });
        }

        // 🔹 NOME
        if (typeof nome !== "string" || nome.trim().length < 3) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Nome deve ter pelo menos 3 caracteres!"
            });
        }

        // 🔹 SENHA
        if (typeof senha !== "string" || senha.trim().length < 8) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Senha deve ter no mínimo 8 caracteres!"
            });
        }

        if (!/^\d+$/.test(senha.trim())) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Senha deve conter apenas números!"
            });
        }

        // 🔹 TELEFONE 1
        const tel1 = telefone1.toString().replace(/\D/g, "");
        if (tel1.length < 11 || tel1.length > 12) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "telefone1 deve ter entre 11 e 12 dígitos!"
            });
        }

        // 🔹 TELEFONE 2 (opcional)
        if (telefone2) {
            const tel2 = telefone2.toString().replace(/\D/g, "");
            if (tel2.length < 11 || tel2.length > 12) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "telefone2 deve ter entre 11 e 12 dígitos!"
                });
            }
        }

        // 🔹 EMAIL 1
        if (typeof email1 !== "string" || !email1.includes("@")) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "email1 deve ser um email válido!"
            });
        }

        // 🔹 EMAIL 2 (opcional)
        if (email2) {
            if (typeof email2 !== "string" || !email2.includes("@")) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "email2 deve ser um email válido!"
                });
            }
        }

        next();
    };

    /**
     * Valida body para UPDATE (PUT) — campos opcionais.
     * Só valida o formato de quem realmente foi enviado; nada é obrigatório,
     * já que o Service usa o valor atual do banco quando o campo não vier.
     */
    validateUpdateBody = (req, res, next) => {
        console.log("🔷 ProfessorMiddleware.validateUpdateBody()");
        const body = req.body;

        if (!body || Object.keys(body).length === 0) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Body da requisição é obrigatório e não pode estar vazio!"
            });
        }

        const { nome, senha, telefone1, telefone2, email1, email2, coordenador } = body;

        if (nome !== undefined) {
            if (typeof nome !== "string" || nome.trim().length < 3) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "Nome deve ter pelo menos 3 caracteres!"
                });
            }
        }

        if (senha !== undefined) {
            if (typeof senha !== "string" || senha.trim().length < 8) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "Senha deve ter no mínimo 8 caracteres!"
                });
            }

            if (!/^\d+$/.test(senha.trim())) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "Senha deve conter apenas números!"
                });
            }
        }

        if (telefone1 !== undefined) {
            const tel1 = telefone1.toString().replace(/\D/g, "");
            if (tel1.length < 11 || tel1.length > 12) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "telefone1 deve ter entre 11 e 12 dígitos!"
                });
            }
        }

        if (telefone2) {
            const tel2 = telefone2.toString().replace(/\D/g, "");
            if (tel2.length < 11 || tel2.length > 12) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "telefone2 deve ter entre 11 e 12 dígitos!"
                });
            }
        }

        if (email1 !== undefined) {
            if (typeof email1 !== "string" || !email1.includes("@")) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "email1 deve ser um email válido!"
                });
            }
        }

        if (email2) {
            if (typeof email2 !== "string" || !email2.includes("@")) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "email2 deve ser um email válido!"
                });
            }
        }

        if (coordenador !== undefined) {
            const valido =
                typeof coordenador === "boolean" ||
                coordenador === 0 || coordenador === 1 ||
                coordenador === "0" || coordenador === "1";

            if (!valido) {
                throw new ErrorResponse(400, "Erro na validação", {
                    message: "coordenador deve ser true, false, 0 ou 1!"
                });
            }
        }

        next();
    };

    /**
     * Valida parâmetro registro
     */
    validateRegistroParam = (req, res, next) => {
        console.log("🔷 ProfessorMiddleware.validateRegistroParam()");
        const { registro } = req.params;

        if (!registro || isNaN(Number(registro)) || Number(registro) <= 0) {
            throw new ErrorResponse(400, "Erro na validação", {
                message: "Parâmetro 'registro' deve ser um número inteiro positivo!"
            });
        }

        next();
    };
};