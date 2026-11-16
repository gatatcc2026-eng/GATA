const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class AlunoMiddleware {

    /* =========================================================
       CRIAR ALUNO
    ========================================================= */

    validateBody = (req, res, next) => {

        console.log("========== ALUNO MIDDLEWARE ==========");
        console.log("BODY RECEBIDO:");
        console.log(req.body);
        console.log("======================================");

        const body = req.body;

        if (!body) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message: "Body da requisição é obrigatório!"
                }
            );
        }


        const {
            matricula,
            nome,
            email,
            senha,
            telefone,
            Curso_idCurso,
            Turma_idTurma,
            ano
        } = body;


        /* =====================================================
           CAMPOS OBRIGATÓRIOS
        ===================================================== */

        const campos = [
            "matricula",
            "nome",
            "email",
            "senha",
            "telefone",
            "Curso_idCurso",
            "Turma_idTurma",
            "ano"
        ];


        for (const campo of campos) {

            if (
                body[campo] === undefined ||
                body[campo] === null ||
                String(body[campo]).trim() === ""
            ) {

                console.log(
                    "❌ Campo inválido:",
                    campo,
                    body[campo]
                );

                throw new ErrorResponse(
                    400,
                    "Erro na validação",
                    {
                        message:
                            `O campo '${campo}' é obrigatório!`
                    }
                );
            }
        }


        /* =====================================================
           MATRÍCULA
        ===================================================== */

        const matriculaNumero =
            Number(matricula);


        if (
            !Number.isInteger(matriculaNumero) ||
            matriculaNumero <= 0
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Matrícula deve ser um número válido!"
                }
            );
        }


        if (
            String(matricula).length < 8
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Matrícula deve ter pelo menos 8 dígitos!"
                }
            );
        }


        /* =====================================================
           NOME
        ===================================================== */

        if (
            typeof nome !== "string" ||
            nome.trim().length < 3
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Nome deve ter pelo menos 3 caracteres!"
                }
            );
        }


        /* =====================================================
           EMAIL
        ===================================================== */

        if (
            typeof email !== "string" ||
            !email.includes("@") ||
            !email.endsWith(".com")
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Email deve ser válido!"
                }
            );
        }


        /* =====================================================
           SENHA
        ===================================================== */

        if (
            typeof senha !== "string" ||
            senha.trim().length < 8
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Senha deve ter no mínimo 8 caracteres!"
                }
            );
        }


        if (
            !/^\d+$/.test(
                senha.trim()
            )
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Senha deve conter apenas números!"
                }
            );
        }


        /* =====================================================
           TELEFONE
        ===================================================== */

        const telefoneString =
            String(telefone).replace(
                /\D/g,
                ""
            );


        if (
            telefoneString.length < 11 ||
            telefoneString.length > 12
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Telefone deve ter entre 11 e 12 dígitos!"
                }
            );
        }


        /* =====================================================
           CURSO
        ===================================================== */

        const cursoNumero =
            Number(Curso_idCurso);


        if (
            !Number.isInteger(cursoNumero) ||
            cursoNumero <= 0
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Curso deve ser um ID válido!"
                }
            );
        }


        /* =====================================================
           TURMA
        ===================================================== */

        const turmaNumero =
            Number(Turma_idTurma);


        if (
            !Number.isInteger(turmaNumero) ||
            turmaNumero <= 0
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Turma deve ser um ID válido!"
                }
            );
        }


        /* =====================================================
           ANO
        ===================================================== */

        const anoNumero =
            Number(ano);


        if (
            !Number.isInteger(anoNumero) ||
            String(ano).length !== 4
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Ano deve ter 4 dígitos!"
                }
            );
        }


        console.log(
            "✅ Aluno validado com sucesso!"
        );


        next();
    };


    /* =========================================================
       ATUALIZAR ALUNO
    ========================================================= */

    validateUpdateBody = (req, res, next) => {

        console.log(
            "🔷 AlunoMiddleware.validateUpdateBody()"
        );


        const {
            nome,
            email
        } = req.body;


        if (
            nome === undefined &&
            email === undefined
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Informe pelo menos um dado para atualizar!"
                }
            );
        }


        /* =====================================================
           NOME
        ===================================================== */

        if (
            nome !== undefined &&
            (
                typeof nome !== "string" ||
                nome.trim().length < 3
            )
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Nome deve ter pelo menos 3 caracteres!"
                }
            );
        }


        /* =====================================================
           EMAIL
        ===================================================== */

        if (
            email !== undefined &&
            (
                typeof email !== "string" ||
                !email.includes("@") ||
                !email.endsWith(".com")
            )
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Email deve ser válido!"
                }
            );
        }


        next();
    };


    /* =========================================================
       VALIDAR MATRÍCULA
    ========================================================= */

    validateMatriculaParam = (req, res, next) => {

        const {
            matricula
        } = req.params;


        const matriculaNumero =
            Number(matricula);


        if (
            !Number.isInteger(matriculaNumero) ||
            matriculaNumero <= 0
        ) {

            throw new ErrorResponse(
                400,
                "Erro na validação",
                {
                    message:
                        "Parâmetro 'matricula' deve ser um número válido!"
                }
            );
        }


        next();
    };


    /* =========================================================
       LOGIN
    ========================================================= */

    validateLoginBody = (req, res, next) => {

        console.log(
            "🔷 AlunoMiddleware.validateLoginBody()"
        );


        const {
            matricula,
            senha
        } = req.body;


        if (
            !matricula ||
            !senha
        ) {

            return res.status(400).json({
                error:
                    "Matricula e senha são obrigatórios!"
            });
        }


        next();
    };

};