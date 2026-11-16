const AlunoService = require("../service/AlunoService");
const ErrorResponse = require("../utils/ErrorResponse");
const MeuTokenJWT = require("../http/MeuTokenJWT");
const bcrypt = require("bcryptjs");

const HASH_FALSO = bcrypt.hashSync("senha-falsa-para-igualar-tempo", 10);

module.exports = class AlunoControl {

    #alunoService;


    // =========================================================
    // CONSTRUTOR
    // =========================================================

    constructor(alunoServiceDependency) {

        console.log(
            "✅ AlunoControl.constructor()"
        );

        this.#alunoService =
            alunoServiceDependency;
    }


    // =========================================================
    // CRIAR ALUNO
    // =========================================================

    store = async (req, res) => {

        console.log(
            "✅ AlunoControl.store()"
        );

        try {

            const novoAluno =
                await this.#alunoService.createAluno(
                    req.body
                );

            return res.status(201).json({
                message:
                    "Aluno criado com sucesso!",
                matricula:
                    novoAluno
            });

        } catch (error) {

            console.error(
                "❌ Erro em AlunoControl.store():",
                error
            );

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

            return res.status(400).json({
                error:
                    error.message ||
                    "Erro ao criar aluno!"
            });
        }
    };


    // =========================================================
    // LISTAR
    // =========================================================

    index = async (req, res) => {

        console.log(
            "✅ AlunoControl.index()"
        );

        try {

            const cursoCoordenado =
                req.user?.cursoCoordenado;

            /*
             * ?todos=true ignora o filtro de curso do
             * coordenador logado — usado na tela de
             * transferência, onde o coordenador precisa
             * localizar um aluno de outro curso para
             * puxá-lo para o curso dele.
             */

            const ignorarFiltro =
                req.query?.todos === "true";

            let alunos =
                await this.#alunoService.findAll();

            if (
                cursoCoordenado &&
                !ignorarFiltro
            ) {

                alunos =
                    alunos.filter(
                        aluno =>
                            Number(
                                aluno.Curso_idCurso
                            ) === Number(
                                cursoCoordenado
                            )
                    );
            }

            return res.status(200).json(
                alunos
            );

        } catch (error) {

            console.error(
                "❌ Erro em AlunoControl.index():",
                error
            );

            return res.status(500).json({
                error:
                    error.message ||
                    "Erro ao buscar alunos!"
            });
        }
    };


    // =========================================================
    // BUSCAR POR MATRÍCULA
    // =========================================================

    show = async (req, res) => {

        console.log(
            "✅ AlunoControl.show()"
        );

        try {

            const { matricula } =
                req.params;

            const aluno =
                await this.#alunoService.findById(
                    matricula
                );

            if (!aluno) {

                return res.status(404).json({
                    error:
                        "Aluno não encontrado!"
                });
            }

            return res.status(200).json(
                aluno
            );

        } catch (error) {

            console.error(
                "❌ Erro em AlunoControl.show():",
                error
            );

            return res.status(500).json({
                error:
                    error.message ||
                    "Erro ao buscar aluno!"
            });
        }
    };


    // =========================================================
    // ATUALIZAR
    // =========================================================
    //
    // Exige coordenador logado. O campo "curso" (ou
    // "Curso_idCurso") vindo no corpo é sempre descartado
    // aqui: a única via para mudar o curso de um aluno é o
    // fluxo de solicitação de transferência, que confere se o
    // aluno tem notas antes de mover.
    //
    // =========================================================

    update = async (req, res) => {

        console.log(
            "✅ AlunoControl.update()"
        );

        try {

            const { matricula } =
                req.params;

            const cursoCoordenado =
                req.user?.cursoCoordenado;

            if (!cursoCoordenado) {

                throw new ErrorResponse(
                    403,
                    "Apenas coordenadores de curso podem editar alunos.",
                    {
                        message:
                            "Acesso negado."
                    }
                );
            }

            const {
                curso,
                Curso_idCurso,
                ...dadosPermitidos
            } = req.body;

            const atualizado =
                await this.#alunoService.updateAluno(
                    {
                        matricula,
                        ...dadosPermitidos
                    },
                    cursoCoordenado
                );

            if (!atualizado) {

                return res.status(404).json({
                    error:
                        "Aluno não encontrado!"
                });
            }

            return res.status(200).json({
                message:
                    "Aluno atualizado com sucesso!"
            });

        } catch (error) {

            console.error(
                "❌ Erro em AlunoControl.update():",
                error
            );

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

            return res.status(400).json({
                error:
                    error.message ||
                    "Erro ao atualizar aluno!"
            });
        }
    };


    // =========================================================
    // PROFESSORES DAS DISCIPLINAS DO ALUNO (GET /:matricula/professores)
    // =========================================================

    professoresDoAluno = async (req, res) => {

        console.log(
            "✅ AlunoControl.professoresDoAluno()"
        );

        try {

            const { matricula } =
                req.params;

            const resultado =
                await this.#alunoService.professoresDoAluno(
                    matricula
                );

            return res.status(200).json(
                resultado
            );

        } catch (error) {

            console.error(
                "❌ Erro em AlunoControl.professoresDoAluno():",
                error
            );

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

            return res.status(500).json({
                error:
                    error.message ||
                    "Erro ao buscar professores do aluno!"
            });
        }
    };


    // =========================================================
    // DISCIPLINAS DO ALUNO (GET /:matricula/disciplinas)
    // Resposta: { disciplinas: [ids], comNota: [ids] }
    // =========================================================

    disciplinasDoAluno = async (req, res) => {

        console.log(
            "✅ AlunoControl.disciplinasDoAluno()"
        );

        try {

            const { matricula } =
                req.params;

            const resultado =
                await this.#alunoService.disciplinasDoAluno(
                    matricula
                );

            return res.status(200).json(
                resultado
            );

        } catch (error) {

            console.error(
                "❌ Erro em AlunoControl.disciplinasDoAluno():",
                error
            );

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

            return res.status(500).json({
                error:
                    error.message ||
                    "Erro ao buscar disciplinas do aluno!"
            });
        }
    };


    // =========================================================
    // ATUALIZAR DISCIPLINAS DO ALUNO (PUT /disciplinas/:matricula)
    // Corpo: { disciplinas: [ids] }
    // =========================================================

    atualizarDisciplinas = async (req, res) => {

        console.log(
            "✅ AlunoControl.atualizarDisciplinas()"
        );

        try {

            const { matricula } =
                req.params;

            const cursoCoordenado =
                req.user?.cursoCoordenado;

            if (!cursoCoordenado) {

                throw new ErrorResponse(
                    403,
                    "Apenas coordenadores de curso podem editar alunos.",
                    {
                        message:
                            "Acesso negado."
                    }
                );
            }

            if (!Array.isArray(req.body?.disciplinas)) {

                return res.status(400).json({
                    error:
                        "Informe a lista de disciplinas."
                });
            }

            const resultado =
                await this.#alunoService.atualizarDisciplinasDoAluno(
                    matricula,
                    req.body.disciplinas,
                    cursoCoordenado
                );

            return res.status(200).json({
                message:
                    "Disciplinas do aluno atualizadas com sucesso!",
                ...resultado
            });

        } catch (error) {

            console.error(
                "❌ Erro em AlunoControl.atualizarDisciplinas():",
                error
            );

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

            return res.status(400).json({
                error:
                    error.message ||
                    "Erro ao atualizar disciplinas do aluno!"
            });
        }
    };


    // =========================================================
    // DELETAR
    // =========================================================

    destroy = async (req, res) => {

        console.log(
            "✅ AlunoControl.destroy()"
        );

        try {

            const { matricula } =
                req.params;

            const deletado =
                await this.#alunoService.delete(
                    matricula
                );

            if (!deletado) {

                return res.status(404).json({
                    error:
                        "Aluno não encontrado!"
                });
            }

            return res.status(200).json({
                message:
                    "Aluno deletado com sucesso!"
            });

        } catch (error) {

            console.error(
                "❌ Erro em AlunoControl.destroy():",
                error
            );

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

            return res.status(400).json({
                error:
                    error.message ||
                    "Erro ao deletar aluno!"
            });
        }
    };


    // =========================================================
    // DELETAR ALUNO COM NOTAS (POST /:matricula/excluir-com-notas)
    // Corpo: { senha } - a senha do coordenador logado.
    // O registro e o curso vêm do token, nunca do corpo.
    // =========================================================

    destroyComNotas = async (req, res) => {

        console.log(
            "✅ AlunoControl.destroyComNotas()"
        );

        try {

            const { matricula } =
                req.params;

            const deletado =
                await this.#alunoService.delete(
                    matricula,
                    {
                        forcar: true,
                        registro: req.user?.registro,
                        cursoCoordenado: req.user?.cursoCoordenado,
                        senha: req.body?.senha
                    }
                );

            if (!deletado) {

                return res.status(404).json({
                    error:
                        "Aluno não encontrado!"
                });
            }

            return res.status(200).json({
                message:
                    "Aluno e notas excluídos com sucesso!"
            });

        } catch (error) {

            console.error(
                "❌ Erro em AlunoControl.destroyComNotas():",
                error
            );

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

            return res.status(400).json({
                error:
                    error.message ||
                    "Erro ao deletar aluno!"
            });
        }
    };


    // =========================================================
    // LOGIN
    // =========================================================

    login = async (req, res) => {

        console.log(
            "✅ AlunoControl.login()"
        );

        try {

            const {
                matricula,
                senha
            } = req.body;

            console.log(
                "📥 Login recebido:",
                {
                    matricula,
                    senhaInformada:
                        !!senha
                }
            );

            if (!matricula || !senha) {

                return res.status(400).json({
                    error:
                        "Matricula e senha são obrigatórios!"
                });
            }


            const resultado =
                await this.#alunoService.findByField(
                    "matricula",
                    matricula
                );

            console.log("🔎 Login: busca concluída");


            if (
                !resultado ||
                resultado.length === 0
            ) {

                await bcrypt.compare(String(senha), HASH_FALSO);

                return res.status(401).json({
                    error:
                        "Matrícula ou senha inválidos!"
                });
            }


            const usuario =
                resultado[0];


            console.log(
                "👤 Usuário encontrado (dados omitidos)",
                {
                    matricula:
                        usuario.matricula,
                    nome:
                        usuario.nome,
                    temSenha:
                        !!usuario.senha
                }
            );


            if (!usuario.senha) {

                await bcrypt.compare(String(senha), HASH_FALSO);

                return res.status(401).json({
                    error:
                        "Matrícula ou senha inválidos!"
                });
            }


            // -------------------------------------------------
            // COMPARAR SENHA
            // -------------------------------------------------

            const senhaValida =
                await bcrypt.compare(
                    String(senha),
                    usuario.senha
                );


            if (!senhaValida) {

                return res.status(401).json({
                    error:
                        "Matrícula ou senha inválidos!"
                });
            }


            // -------------------------------------------------
            // GERAR JWT
            // -------------------------------------------------

            const jwt =
                new MeuTokenJWT();


            const token =
                jwt.gerarToken({
                    matricula:
                        usuario.matricula,
                    nome:
                        usuario.nome,
                    email:
                        usuario.email,
                    role:
                        "aluno"
                });


            return res.status(200).json({

                status:
                    true,

                token:
                    token,

                aluno: {

                    matricula:
                        usuario.matricula,

                    nome:
                        usuario.nome,

                    email:
                        usuario.email,

                    curso:
                        usuario.Curso_idCurso,

                    turma:
                        usuario.Turma_idTurma,

                    ano:
                        usuario.ano
                }
            });


        } catch (error) {

            console.error(
                "❌ Erro em AlunoControl.login():",
                error
            );

            return res.status(500).json({
                error:
                    error.message ||
                    "Erro no login!"
            });
        }
    };


    // =========================================================
    // LIMPAR REGISTROS
    // =========================================================
    //
    // O registro do coordenador vem do token (req.user), nunca
    // do corpo da requisição — isso impede que alguém informe
    // o registro de outro coordenador no body para tentar
    // limpar um curso que não é o seu.
    //
    // =========================================================

    limparRegistros = async (req, res) => {

        console.log(
            "✅ AlunoControl.limparRegistros()"
        );

        try {

            const registro =
                req.user?.registro;

            const {
                senha
            } = req.body;


            if (!registro) {

                return res.status(401).json({
                    error:
                        "Não autenticado!"
                });
            }


            if (!senha) {

                return res.status(400).json({
                    error:
                        "Senha é obrigatória!"
                });
            }


            const quantidade =
                await this.#alunoService.limparTodos(
                    registro,
                    senha
                );


            return res.status(200).json({

                message:
                    `${quantidade} aluno(s) removido(s) com sucesso!`,

                quantidade
            });


        } catch (error) {

            console.error(
                "❌ Erro em AlunoControl.limparRegistros():",
                error
            );


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


            return res.status(400).json({
                error:
                    error.message ||
                    "Erro ao limpar registros!"
            });
        }
    };
};