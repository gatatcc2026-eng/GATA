const ErrorResponse =
    require("../utils/ErrorResponse");


module.exports = class SolicitacaoTransferenciaService {

    #solicitacaoDAO;
    #alunoDAO;
    #turmaDAO;
    #alunoService;
    #historicoCoordenadorService;


    constructor(
        solicitacaoDAO,
        alunoDAO,
        turmaDAO,
        alunoService,
        historicoCoordenadorService = null
    ) {

        console.log(
            "✅ SolicitacaoTransferenciaService.constructor()"
        );

        this.#solicitacaoDAO =
            solicitacaoDAO;

        this.#alunoDAO =
            alunoDAO;

        this.#turmaDAO =
            turmaDAO;

        this.#alunoService =
            alunoService;

        this.#historicoCoordenadorService =
            historicoCoordenadorService;
    }


    // =========================================================
    // AUXILIARES
    // =========================================================

    #extrairSerie = (nomeTurma) => {

        const match =
            String(nomeTurma || "")
                .match(/^\d+/);

        return match ? match[0] : null;
    };


    #cursoDoCoordenador = (user) => {

        const ehCoordenador =
            user?.coordenador === true ||
            Number(user?.coordenador) === 1;

        const curso =
            Number(user?.cursoCoordenado);

        if (
            !ehCoordenador ||
            !Number.isInteger(curso) ||
            curso <= 0
        ) {

            throw new ErrorResponse(
                403,
                "Apenas coordenadores de curso podem fazer isso.",
                {
                    message:
                        "Acesso negado."
                }
            );
        }

        return curso;
    };


    #registrarHistorico = async (
        registro,
        acao,
        descricao
    ) => {

        if (!this.#historicoCoordenadorService) {
            return;
        }

        try {

            await this.#historicoCoordenadorService
                .registrar(
                    registro,
                    acao,
                    descricao
                );

        } catch (error) {

            console.error(
                "⚠️ Erro ao registrar histórico da transferência:",
                error
            );
        }
    };


    #buscarSolicitacaoPendenteDoMeuCurso = async (
        idSolicitacao,
        cursoCoordenado
    ) => {

        const solicitacao =
            await this.#solicitacaoDAO
                .findById(idSolicitacao);


        if (!solicitacao) {

            throw new ErrorResponse(
                404,
                "Solicitação não encontrada.",
                {
                    message:
                        "Solicitação não encontrada."
                }
            );
        }


        if (solicitacao.status !== "Pendente") {

            throw new ErrorResponse(
                409,
                "Esta solicitação já foi respondida.",
                {
                    message:
                        "Esta solicitação já foi respondida."
                }
            );
        }


        if (
            Number(solicitacao.idCursoDestino) !==
            Number(cursoCoordenado)
        ) {

            throw new ErrorResponse(
                403,
                "Somente o coordenador do curso de destino pode responder.",
                {
                    message:
                        "Acesso negado."
                }
            );
        }

        return solicitacao;
    };


    // =========================================================
    // CRIAR SOLICITAÇÃO
    // =========================================================

    criar = async (dados, user) => {

        console.log(
            "🟢 SolicitacaoTransferenciaService.criar()"
        );


        const cursoCoordenado =
            this.#cursoDoCoordenador(user);


        const matricula =
            Number(dados?.matricula);

        const idCursoDestino =
            Number(dados?.idCursoDestino);

        const idTurmaDestino =
            Number(dados?.idTurmaDestino);


        if (
            ![
                matricula,
                idCursoDestino,
                idTurmaDestino
            ].every(
                n => Number.isInteger(n) && n > 0
            )
        ) {

            throw new ErrorResponse(
                400,
                "Dados da solicitação inválidos.",
                {
                    message:
                        "Informe matrícula, curso e turma de destino."
                }
            );
        }


        const aluno =
            await this.#alunoDAO
                .findById(matricula);


        if (!aluno) {

            throw new ErrorResponse(
                404,
                "Aluno não encontrado.",
                {
                    message:
                        "Aluno não encontrado."
                }
            );
        }


        if (
            Number(aluno.Curso_idCurso) !==
            cursoCoordenado
        ) {

            throw new ErrorResponse(
                403,
                "Você só pode solicitar a troca de alunos do curso que você coordena.",
                {
                    message:
                        "Acesso negado."
                }
            );
        }


        if (idCursoDestino === cursoCoordenado) {

            throw new ErrorResponse(
                400,
                "O curso de destino é o mesmo curso atual do aluno.",
                {
                    message:
                        "Escolha outro curso."
                }
            );
        }


        const totalNotas =
            await this.#solicitacaoDAO
                .contarNotasDoAluno(matricula);


        if (totalNotas > 0) {

            throw new ErrorResponse(
                409,
                "Este aluno já possui notas lançadas e não pode trocar de curso.",
                {
                    message:
                        "Aluno com notas não pode trocar de curso."
                }
            );
        }


        const turmaDestino =
            await this.#turmaDAO
                .findById(idTurmaDestino);


        if (
            !turmaDestino ||
            Number(turmaDestino.Curso_idCurso) !==
                idCursoDestino
        ) {

            throw new ErrorResponse(
                400,
                "A turma informada não pertence ao curso de destino.",
                {
                    message:
                        "Turma incompatível."
                }
            );
        }


        const turmaAtual =
            await this.#turmaDAO
                .findById(aluno.Turma_idTurma);


        const serieAtual =
            this.#extrairSerie(
                turmaAtual?.nomeTurma
            );

        const serieDestino =
            this.#extrairSerie(
                turmaDestino.nomeTurma
            );


        if (
            serieAtual &&
            serieDestino &&
            serieAtual !== serieDestino
        ) {

            throw new ErrorResponse(
                400,
                `O aluno só pode ser transferido para uma turma do ${serieAtual}º ano.`,
                {
                    message:
                        "Série incompatível."
                }
            );
        }


        const pendente =
            await this.#solicitacaoDAO
                .findPendenteByMatricula(matricula);


        if (pendente) {

            throw new ErrorResponse(
                409,
                "Já existe uma solicitação pendente para este aluno.",
                {
                    message:
                        "Solicitação duplicada."
                }
            );
        }


        const idSolicitacao =
            await this.#solicitacaoDAO.create({

                matricula,

                idCursoOrigem:
                    cursoCoordenado,

                idCursoDestino,

                idTurmaDestino,

                solicitadoPor:
                    user.registro

            });


        await this.#registrarHistorico(
            user.registro,
            "Solicitação de troca de curso",
            `Solicitou a troca de curso do aluno ${aluno.nome} (${matricula}).`
        );


        return {
            idSolicitacao
        };
    };


    // =========================================================
    // LISTAR (recebidas e enviadas do meu curso)
    // =========================================================

    listar = async (user) => {

        const cursoCoordenado =
            this.#cursoDoCoordenador(user);


        return this.#solicitacaoDAO
            .findRelacionadas(cursoCoordenado);
    };


    // =========================================================
    // ACEITAR
    //
    // Retomável: se uma aceitação anterior falhou no meio do
    // caminho (depois de já ter movido o aluno para o curso
    // novo, mas antes de responder a solicitação), clicar em
    // Aceitar de novo termina o que faltou em vez de dar erro
    // de "solicitação desatualizada".
    // =========================================================

    aceitar = async (idSolicitacao, user) => {

        console.log(
            "🟢 SolicitacaoTransferenciaService.aceitar():",
            idSolicitacao
        );


        const cursoCoordenado =
            this.#cursoDoCoordenador(user);


        const solicitacao =
            await this.#buscarSolicitacaoPendenteDoMeuCurso(
                idSolicitacao,
                cursoCoordenado
            );


        const aluno =
            await this.#alunoDAO
                .findById(solicitacao.matricula);


        const jaNoDestino =
            !!aluno &&
            Number(aluno.Curso_idCurso) ===
                Number(solicitacao.idCursoDestino);

        const aindaNaOrigem =
            !!aluno &&
            Number(aluno.Curso_idCurso) ===
                Number(solicitacao.idCursoOrigem);


        if (!jaNoDestino && !aindaNaOrigem) {

            throw new ErrorResponse(
                409,
                "O aluno não está mais no curso de origem. Recuse esta solicitação.",
                {
                    message:
                        "Solicitação desatualizada."
                }
            );
        }


        // Só move o aluno se ele ainda não foi movido nesta
        // aceitação (permite retomar uma tentativa anterior
        // que falhou no meio).

        if (aindaNaOrigem) {

            const totalNotas =
                await this.#solicitacaoDAO
                    .contarNotasDoAluno(solicitacao.matricula);


            if (totalNotas > 0) {

                throw new ErrorResponse(
                    409,
                    "O aluno já recebeu notas, então não pode mais trocar de curso. Recuse esta solicitação.",
                    {
                        message:
                            "Aluno com notas."
                    }
                );
            }


            /*
             * Reaproveita as regras do updateAluno: turma
             * pertence ao curso, mesma série e criação dos
             * vínculos com as disciplinas do curso novo.
             */

            await this.#alunoService.updateAluno(
                {
                    matricula:
                        solicitacao.matricula,

                    curso:
                        solicitacao.idCursoDestino,

                    turma:
                        solicitacao.idTurmaDestino
                },
                cursoCoordenado
            );
        }


        // Idempotente: garante os vínculos do curso novo mesmo
        // que o updateAluno já os tenha criado numa tentativa
        // anterior.

        await this.#solicitacaoDAO
            .garantirVinculosDoCurso(
                solicitacao.matricula,
                solicitacao.idCursoDestino
            );


        await this.#solicitacaoDAO
            .removerVinculosDoCurso(
                solicitacao.matricula,
                solicitacao.idCursoOrigem
            );


        await this.#solicitacaoDAO
            .responder(
                idSolicitacao,
                "Aceita",
                user.registro
            );


        await this.#registrarHistorico(
            user.registro,
            "Troca de curso aceita",
            `Aceitou a transferência do aluno ${aluno?.nome ?? solicitacao.matricula} (${solicitacao.matricula}) para o seu curso.`
        );


        return {
            status: "Aceita"
        };
    };


    // =========================================================
    // RECUSAR
    // =========================================================

    recusar = async (idSolicitacao, user) => {

        console.log(
            "🟢 SolicitacaoTransferenciaService.recusar():",
            idSolicitacao
        );


        const cursoCoordenado =
            this.#cursoDoCoordenador(user);


        const solicitacao =
            await this.#buscarSolicitacaoPendenteDoMeuCurso(
                idSolicitacao,
                cursoCoordenado
            );


        await this.#solicitacaoDAO
            .responder(
                idSolicitacao,
                "Recusada",
                user.registro
            );


        await this.#registrarHistorico(
            user.registro,
            "Troca de curso recusada",
            `Recusou a transferência do aluno ${solicitacao.matricula} para o seu curso.`
        );


        return {
            status: "Recusada"
        };
    };

};