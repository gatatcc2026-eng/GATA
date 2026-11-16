const ErrorResponse =
    require("../utils/ErrorResponse");

const MeuTokenJWT =
    require("../http/MeuTokenJWT");


module.exports = class ProfessorControl {

    #professorService;


    // =========================================================
    // CONSTRUTOR
    // =========================================================

    constructor(professorServiceDependency) {

        console.log(
            "✅ ProfessorControl.constructor()"
        );

        this.#professorService =
            professorServiceDependency;
    }


    // =========================================================
    // RESPOSTA DE ERRO PADRÃO
    // =========================================================

    #responderErro = (
        res,
        error,
        mensagemPadrao,
        statusPadrao
    ) => {

        if (error instanceof ErrorResponse) {

            return res
                .status(error.httpCode)
                .json({

                    error:
                        error.message,

                    details:
                        error.error
                });
        }


        return res.status(statusPadrao).json({

            error:
                error.message ||
                mensagemPadrao
        });
    };


    // =========================================================
    // CRIAR PROFESSOR
    // (entra no curso do coordenador logado)
    // =========================================================

    store = async (req, res) => {

        console.log(
            "✅ ProfessorControl.store()"
        );

        try {

            const dadosProfessor = {
                ...req.body
            };


            console.log(
                "📥 Body recebido:",
                {
                    ...req.body,

                    senha:
                        req.body.senha
                            ? "********"
                            : undefined
                }
            );


            const novoProfessor =
                await this.#professorService.createProfessor(
                    dadosProfessor,
                    Number(req.user?.registro)
                );


            return res.status(201).json({

                message:
                    "Professor criado com sucesso!",

                registro:
                    novoProfessor.registro ??
                    novoProfessor
            });


        } catch (error) {

            console.error(
                "❌ Erro em ProfessorControl.store():",
                error
            );

            return this.#responderErro(
                res,
                error,
                "Erro ao criar professor!",
                400
            );
        }
    };


    // =========================================================
    // LISTAR PROFESSORES
    //
    // Coordenador: só professores vinculados ao curso dele
    // (professor_curso), já com os nomes dos cursos.
    //
    // ?todos=true devolve todos (com os cursos). Não use para
    // escolher professor de uma disciplina: o banco só aceita
    // professor vinculado ao curso da disciplina.
    // =========================================================

    index = async (req, res) => {

        console.log(
            "✅ ProfessorControl.index()"
        );


        try {

            const registroLogado =
                Number(
                    req.user?.registro
                );

            const cursoCoordenado =
                Number(
                    req.user?.cursoCoordenado
                ) || null;

            const todos =
                String(
                    req.query?.todos
                ).toLowerCase() === "true";


            console.log(
                "👤 Registro logado:",
                registroLogado
            );

            console.log(
                "🏫 Curso coordenado:",
                cursoCoordenado
            );


            const professores =
                (cursoCoordenado && !todos)
                    ? await this.#professorService.listarDoMeuCurso(
                        registroLogado
                    )
                    : await this.#professorService.findAllComCursos();


            console.log(
                "📋 Quantidade de professores:",
                professores.length
            );


            return res.status(200).json(
                professores
            );


        } catch (error) {

            console.error(
                "❌ Erro em ProfessorControl.index():",
                error
            );

            return this.#responderErro(
                res,
                error,
                "Erro ao buscar professores!",
                500
            );
        }
    };


    // =========================================================
    // PROFESSORES QUE AINDA NÃO ESTÃO NO MEU CURSO
    // (botão "Adicionar professor existente")
    //
    // GET /professores/disponiveis?termo=maria
    // =========================================================

    disponiveis = async (req, res) => {

        console.log(
            "✅ ProfessorControl.disponiveis()"
        );


        try {

            const professores =
                await this.#professorService.buscarDisponiveis(
                    Number(req.user?.registro),
                    req.query?.termo || ""
                );


            return res.status(200).json(
                professores
            );


        } catch (error) {

            console.error(
                "❌ Erro em ProfessorControl.disponiveis():",
                error
            );

            return this.#responderErro(
                res,
                error,
                "Erro ao buscar professores!",
                500
            );
        }
    };


    // =========================================================
    // BUSCAR PROFESSOR POR REGISTRO
    // =========================================================

    show = async (req, res) => {

        console.log(
            "✅ ProfessorControl.show()"
        );


        try {

            const {
                registro
            } = req.params;


            const professor =
                await this.#professorService.findByRegistro(
                    registro
                );


            if (!professor) {

                return res.status(404).json({

                    error:
                        "Professor não encontrado!"
                });
            }


            // nunca devolve a senha
            const { senha, ...professorSemSenha } =
                professor;


            return res.status(200).json(
                professorSemSenha
            );


        } catch (error) {

            console.error(
                "❌ Erro em ProfessorControl.show():",
                error
            );

            return this.#responderErro(
                res,
                error,
                "Erro ao buscar professor!",
                500
            );
        }
    };


    // =========================================================
    // ATUALIZAR PROFESSOR
    // =========================================================

    update = async (req, res) => {

        console.log(
            "✅ ProfessorControl.update()"
        );


        try {

            const {
                registro
            } = req.params;


            const dadosProfessor = {
                ...req.body
            };


            // senha vazia = manter a atual
            if (

                dadosProfessor.senha !==
                    undefined &&

                dadosProfessor.senha !==
                    null &&

                dadosProfessor.senha
                    .toString()
                    .trim() === ""
            ) {

                delete dadosProfessor.senha;
            }


            console.log(
                "📥 Dados para atualização:",
                {
                    ...dadosProfessor,

                    senha:
                        dadosProfessor.senha
                            ? "********"
                            : undefined
                }
            );


            await this.#professorService.updateProfessor(
                {
                    ...dadosProfessor,
                    registro
                },
                Number(req.user?.registro)
            );


            return res.status(200).json({

                message:
                    "Professor atualizado com sucesso!"
            });


        } catch (error) {

            console.error(
                "❌ Erro em ProfessorControl.update():",
                error
            );

            return this.#responderErro(
                res,
                error,
                "Erro ao atualizar professor!",
                400
            );
        }
    };


    // =========================================================
    // DELETAR PROFESSOR (cadastro inteiro)
    // =========================================================

    destroy = async (req, res) => {

        console.log(
            "✅ ProfessorControl.destroy()"
        );


        try {

            const {
                registro
            } = req.params;


            await this.#professorService.deleteProfessor(
                registro,
                Number(req.user?.registro)
            );


            return res.status(200).json({

                message:
                    "Professor excluído com sucesso!"
            });


        } catch (error) {

            console.error(
                "❌ Erro em ProfessorControl.destroy():",
                error
            );

            return this.#responderErro(
                res,
                error,
                "Erro ao deletar professor!",
                400
            );
        }
    };


    // =========================================================
    // REMOVER PROFESSOR DO MEU CURSO (mantém o cadastro)
    // =========================================================

    removerDoCurso = async (req, res) => {

        console.log(
            "✅ ProfessorControl.removerDoCurso()"
        );


        try {

            const {
                registro
            } = req.params;


            await this.#professorService.removerDoCurso(
                registro,
                Number(req.user?.registro)
            );


            return res.status(200).json({

                message:
                    "Professor removido do curso com sucesso!"
            });


        } catch (error) {

            console.error(
                "❌ Erro em ProfessorControl.removerDoCurso():",
                error
            );

            return this.#responderErro(
                res,
                error,
                "Erro ao remover professor do curso!",
                400
            );
        }
    };


    // =========================================================
    // LOGIN PROFESSOR
    // =========================================================

    login = async (req, res) => {

        console.log(
            "✅ ProfessorControl.login()"
        );

        try {

            const {
                registro,
                senha
            } = req.body;


            console.log(
                "📥 Registro recebido:",
                registro
            );


            if (!registro || !senha) {

                return res.status(400).json({
                    error:
                        "Registro e senha são obrigatórios!"
                });
            }


            const professor =
                await this.#professorService.login(
                    registro,
                    senha
                );


            const ehCoordenador =
                Number(professor.coordenador) === 1 ||
                professor.coordenador === true;


            const cursoCoordenado =
                ehCoordenador
                    ? (
                        professor.CursoCoordenado_idCurso ??
                        null
                    )
                    : null;


            console.log(
                "👨‍🏫 Professor autenticado:",
                professor.nome
            );

            console.log(
                "👤 Coordenador:",
                ehCoordenador
            );

            console.log(
                "🏫 Curso coordenado:",
                cursoCoordenado
            );


            const jwt =
                new MeuTokenJWT();


            const token =
                jwt.gerarToken({

                    registro:
                        professor.registro,

                    nome:
                        professor.nome,

                    email:
                        professor.email1,

                    role:
                        "professor",

                    coordenador:
                        ehCoordenador,

                    cursoCoordenado:
                        cursoCoordenado

                });


            return res.status(200).json({

                status:
                    true,

                token:
                    token,

                professor: {

                    registro:
                        professor.registro,

                    nome:
                        professor.nome,

                    email:
                        professor.email1,

                    coordenador:
                        ehCoordenador,

                    cursoCoordenado:
                        cursoCoordenado

                }

            });


        } catch (error) {

            console.error(
                "❌ Erro em ProfessorControl.login():",
                error
            );

            return this.#responderErro(
                res,
                error,
                "Erro no login!",
                500
            );
        }
    };

};  