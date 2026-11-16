const AlunoDAO = require("../dao/AlunoDAO");
const Aluno = require("../model/Aluno");
const ErrorResponse = require("../utils/ErrorResponse");
const bcrypt = require("bcryptjs");

module.exports = class AlunoService {

    #alunoDAO;
    #professorDAO;
    #historicoCoordenadorDAO;
    #turmaDAO;
    #disciplinaDAO;
    #alunoDisciplinaProfessorDAO;

    constructor(
        AlunoDAODependency,
        professorDAODependency,
        historicoCoordenadorDAODependency,
        turmaDAODependency,
        disciplinaDAODependency,
        alunoDisciplinaProfessorDAODependency
    ) {

        console.log("✅ AlunoService.constructor()");

        this.#alunoDAO =
            AlunoDAODependency;

        this.#professorDAO =
            professorDAODependency;

        this.#historicoCoordenadorDAO =
            historicoCoordenadorDAODependency;

        this.#turmaDAO =
            turmaDAODependency;

        this.#disciplinaDAO =
            disciplinaDAODependency;

        this.#alunoDisciplinaProfessorDAO =
            alunoDisciplinaProfessorDAODependency;
    }


    // =========================================================
    // CRIAR ALUNO
    // =========================================================

    createAluno = async (AlunoJson) => {

        console.log("✅ AlunoService.createAluno() v2");

        const objAlunoModel =
            new Aluno();


        // -----------------------------------------------------
        // DADOS BÁSICOS
        // -----------------------------------------------------

        objAlunoModel.matricula =
            AlunoJson.matricula;

        objAlunoModel.nome =
            AlunoJson.nome;

        objAlunoModel.email =
            String(AlunoJson.email ?? "").trim();

        objAlunoModel.telefone =
            AlunoJson.telefone;

        objAlunoModel.curso.idCurso =
            AlunoJson.Curso_idCurso;

        objAlunoModel.turma.idTurma =
            AlunoJson.Turma_idTurma;

        objAlunoModel.ano =
            AlunoJson.ano;

        objAlunoModel.senha =
            String(AlunoJson.senha);


        // -----------------------------------------------------
        // VERIFICAR SE A MATRÍCULA JÁ EXISTE
        // -----------------------------------------------------

        const resultado =
            await this.#alunoDAO.findByField(
                "matricula",
                objAlunoModel.matricula
            );

        if (resultado.length > 0) {

            throw new ErrorResponse(
                400,
                "Já existe um aluno com esta matrícula!",
                {
                    message:
                        `O Aluno ${objAlunoModel.matricula} já existe!`
                }
            );
        }


        // -----------------------------------------------------
        // VERIFICAR SE O EMAIL JÁ EXISTE
        // (vale para todos os cursos, não só o do coordenador)
        // -----------------------------------------------------

        if (objAlunoModel.email !== "") {

            const emailExistente =
                await this.#alunoDAO.findByField(
                    "email",
                    objAlunoModel.email
                );

            if (emailExistente.length > 0) {

                throw new ErrorResponse(
                    400,
                    "Já existe um aluno com este email!",
                    {
                        message:
                            `O email ${objAlunoModel.email} já está sendo utilizado por outro aluno.`
                    }
                );
            }
        }


        // -----------------------------------------------------
        // CRIPTOGRAFAR SENHA
        // -----------------------------------------------------

        objAlunoModel.senha =
            await bcrypt.hash(
                objAlunoModel.senha,
                10
            );

        return this.#alunoDAO.create(
            objAlunoModel
        );
    };


    // =========================================================
    // LISTAR TODOS
    // =========================================================

    findAll = async () => {

        console.log(
            "✅ AlunoService.findAll()"
        );

        return this.#alunoDAO.findAll();
    };


    // =========================================================
    // BUSCAR POR ID
    // =========================================================

    findById = async (matricula) => {

        console.log(
            "✅ AlunoService.findById()"
        );

        return this.#alunoDAO.findById(
            matricula
        );
    };


    // =========================================================
    // BUSCAR POR CAMPO
    // =========================================================

    findByField = async (field, value) => {

        console.log(
            "✅ AlunoService.findByField()"
        );

        const allowedFields = [
            "matricula",
            "nome",
            "email",
            "senha",
            "telefone",
            "Curso_idCurso",
            "Turma_idTurma",
            "ano"
        ];

        if (!allowedFields.includes(field)) {

            throw new Error(
                "Campo inválido para busca."
            );
        }

        return this.#alunoDAO.findByField(
            field,
            value
        );
    };


    // =========================================================
    // EXTRAIR O DÍGITO DE SÉRIE/ANO NO INÍCIO DO NOME DA TURMA
    // (ex: "3DS" -> "3", "1A" -> "1")
    // =========================================================

    #extrairSerie = (nomeTurma) => {

        const match =
            String(nomeTurma || "")
                .match(/^\d+/);

        return match ? match[0] : null;
    };


    // =========================================================
    // ATUALIZAR ALUNO
    // =========================================================
    //
    // cursoCoordenadoLogado: Curso_idCurso do professor
    // autenticado que está fazendo a chamada (req.user.cursoCoordenado).
    // Se vier undefined/null, nenhuma checagem de permissão de
    // curso é aplicada (ex: chamada administrativa sem contexto
    // de coordenador).
    //
    // =========================================================

    updateAluno = async (
        AlunoJson,
        cursoCoordenadoLogado
    ) => {

        console.log(
            "✅ AlunoService.updateAluno()"
        );

        const {
            matricula,
            nome,
            email,
            senha,
            telefone,
            curso,
            turma,
            ano
        } = AlunoJson;


        // -----------------------------------------------------
        // BUSCAR ALUNO ATUAL
        // -----------------------------------------------------

        const alunoAtual =
            await this.#alunoDAO.findById(
                matricula
            );

        if (!alunoAtual) {

            throw new Error(
                `Aluno com matricula ${matricula} não encontrado!`
            );
        }

        // -----------------------------------------------------
        // EMAIL DUPLICADO (ignora o próprio aluno)
        // -----------------------------------------------------

        if (
            email !== undefined &&
            email !== null &&
            String(email).trim() !== ""
        ) {

            const emailExistente =
                await this.#alunoDAO.findByField(
                    "email",
                    String(email).trim()
                );

            const usadoPorOutro =
                emailExistente.some(
                    a => Number(a.matricula) !== Number(matricula)
                );

            if (usadoPorOutro) {

                throw new ErrorResponse(
                    400,
                    "Já existe um aluno com este email!",
                    {
                        message:
                            `O email ${String(email).trim()} já está sendo utilizado por outro aluno.`
                    }
                );
            }
        }

        const cursoAtual =
            Number(alunoAtual.Curso_idCurso);

        const turmaAtual =
            Number(alunoAtual.Turma_idTurma);


        const cursoInformado =
            (curso !== undefined && curso !== null && curso !== "")
                ? Number(curso)
                : cursoAtual;

        const turmaInformada =
            (turma !== undefined && turma !== null && turma !== "")
                ? Number(turma)
                : turmaAtual;


        const mudouCurso =
            cursoInformado !== cursoAtual;

        const mudouTurma =
            turmaInformada !== turmaAtual;


        // -----------------------------------------------------
        // PERMISSÃO DO COORDENADOR
        // -----------------------------------------------------
        //
        // Se a chamada informou o curso coordenado pelo
        // professor logado:
        //
        //   - transferindo de curso -> só pode ser para o
        //     curso que ele coordena;
        //
        //   - sem mudar de curso -> o aluno editado precisa já
        //     pertencer ao curso que ele coordena.
        //
        // -----------------------------------------------------

        if (
            cursoCoordenadoLogado !== undefined &&
            cursoCoordenadoLogado !== null
        ) {

            const cursoPermitido =
                Number(cursoCoordenadoLogado);

            if (mudouCurso) {

                if (cursoInformado !== cursoPermitido) {

                    throw new ErrorResponse(
                        403,
                        "Ação não permitida.",
                        {
                            message:
                                "Você só pode transferir alunos para o curso que você coordena."
                        }
                    );
                }

            } else if (cursoAtual !== cursoPermitido) {

                throw new ErrorResponse(
                    403,
                    "Ação não permitida.",
                    {
                        message:
                            "Você só pode editar alunos do curso que você coordena."
                    }
                );
            }
        }


        // -----------------------------------------------------
        // VALIDAR TURMA (quando curso e/ou turma mudarem)
        // -----------------------------------------------------

        if (mudouTurma || mudouCurso) {

            const turmaNova =
                await this.#turmaDAO.findById(
                    turmaInformada
                );

            if (!turmaNova) {

                throw new ErrorResponse(
                    400,
                    "Turma inválida!",
                    {
                        message:
                            "A turma informada não existe."
                    }
                );
            }

            if (
                Number(turmaNova.Curso_idCurso) !==
                cursoInformado
            ) {

                throw new ErrorResponse(
                    400,
                    "Turma incompatível!",
                    {
                        message:
                            "A turma informada não pertence ao curso selecionado."
                    }
                );
            }


            const turmaAntiga =
                await this.#turmaDAO.findById(
                    turmaAtual
                );

            const serieAntiga =
                this.#extrairSerie(
                    turmaAntiga?.nomeTurma
                );

            const serieNova =
                this.#extrairSerie(
                    turmaNova.nomeTurma
                );

            if (
                serieAntiga &&
                serieNova &&
                serieAntiga !== serieNova
            ) {

                throw new ErrorResponse(
                    400,
                    "Série incompatível!",
                    {
                        message:
                            `O aluno só pode ser transferido para uma turma do ${serieAntiga}º ano.`
                    }
                );
            }
        }


        const objAlunoModel =
            new Aluno();


        // -----------------------------------------------------
        // DADOS
        // -----------------------------------------------------

        objAlunoModel.matricula =
            matricula;

        objAlunoModel.nome =
            nome ?? alunoAtual.nome;

        objAlunoModel.email =
            email ?? alunoAtual.email;

        objAlunoModel.telefone =
            telefone ?? alunoAtual.telefone;

        objAlunoModel.curso.idCurso =
            cursoInformado;

        objAlunoModel.turma.idTurma =
            turmaInformada;

        objAlunoModel.ano =
            ano ?? alunoAtual.ano;


        // -----------------------------------------------------
        // SENHA
        // -----------------------------------------------------

        /*
         * Se o usuário digitou uma senha nova:
         *
         * 12345678
         *
         * valida primeiro e depois criptografa.
         */

        if (
            senha !== undefined &&
            senha !== null &&
            String(senha).trim() !== ""
        ) {

            objAlunoModel.senha =
                String(senha);

            objAlunoModel.senha =
                await bcrypt.hash(
                    objAlunoModel.senha,
                    10
                );

            console.log(
                "🔐 Nova senha do aluno criptografada!"
            );

        } else {

            /*
             * Senha não foi alterada.
             *
             * O banco já possui:
             *
             * $2b$10$...
             *
             * O Model agora permite receber
             * esse hash sem tentar criptografá-lo novamente.
             */

            objAlunoModel.senha =
                alunoAtual.senha;

            console.log(
                "🔐 Senha antiga do aluno mantida."
            );
        }


        // -----------------------------------------------------
        // ATUALIZAR
        // -----------------------------------------------------

        const resultadoUpdate =
            await this.#alunoDAO.update(
                objAlunoModel
            );


        // -----------------------------------------------------
        // TRANSFERÊNCIA DE CURSO:
        // CRIAR VÍNCULOS ADP PARA AS DISCIPLINAS DO CURSO NOVO
        // (sem apagar os vínculos antigos, sem duplicar)
        // -----------------------------------------------------

        if (mudouCurso) {

            console.log(
                `🔁 Transferência de curso detectada (matricula ${matricula}): ${cursoAtual} -> ${cursoInformado}`
            );

            const disciplinasCursoNovo =
                await this.#disciplinaDAO.findByField(
                    "Curso_idCurso",
                    cursoInformado
                );

            const vinculosExistentes =
                await this.#alunoDisciplinaProfessorDAO.findByField(
                    "Aluno_matricula",
                    matricula
                );

            const disciplinasJaVinculadas =
                vinculosExistentes.map(
                    v => Number(v.Disciplina_idDisciplina)
                );

            for (
                const disciplina
                of disciplinasCursoNovo
            ) {

                if (
                    !disciplinasJaVinculadas.includes(
                        Number(disciplina.idDisciplina)
                    )
                ) {

                    await this.#alunoDisciplinaProfessorDAO.create({

                        disciplina: {
                            idDisciplina:
                                disciplina.idDisciplina
                        },

                        aluno: {
                            matricula:
                                matricula
                        }
                    });

                    console.log(
                        `➕ Vínculo criado: matricula ${matricula} <-> disciplina ${disciplina.idDisciplina}`
                    );
                }
            }
        }


        return resultadoUpdate;
    };


    // =========================================================
    // PROFESSORES DAS DISCIPLINAS DO ALUNO
    // Devolve [{ idDisciplina, registro, nome }] da turma dele.
    // =========================================================

    professoresDoAluno = async (matricula) => {

        console.log(
            "✅ AlunoService.professoresDoAluno()"
        );

        const aluno =
            await this.#alunoDAO.findById(
                matricula
            );

        if (!aluno) {

            throw new ErrorResponse(
                404,
                "Aluno não encontrado!",
                {
                    message:
                        `Aluno com matrícula ${matricula} não encontrado.`
                }
            );
        }

        return this.#alunoDAO.findProfessoresDasDisciplinas(
            matricula
        );
    };


    // =========================================================
    // DISCIPLINAS DO ALUNO
    // Devolve os ids vinculados e, entre eles, os que já têm nota
    // (esses ficam travados na tela e no servidor).
    // =========================================================

    disciplinasDoAluno = async (matricula) => {

        console.log(
            "✅ AlunoService.disciplinasDoAluno()"
        );

        const aluno =
            await this.#alunoDAO.findById(
                matricula
            );

        if (!aluno) {

            throw new ErrorResponse(
                404,
                "Aluno não encontrado!",
                {
                    message:
                        `Aluno com matrícula ${matricula} não encontrado.`
                }
            );
        }

        const disciplinas =
            await this.#alunoDAO.findIdsDisciplinasDoAluno(
                matricula
            );

        const comNota =
            await this.#alunoDAO.findIdsDisciplinasComNota(
                matricula
            );

        return {
            disciplinas,
            comNota
        };
    };


    // =========================================================
    // ATUALIZAR DISCIPLINAS DO ALUNO
    // Só o coordenador do curso do aluno. Disciplina com nota
    // não pode ser removida (o DAO recusa com 409).
    // =========================================================

    atualizarDisciplinasDoAluno = async (
        matricula,
        idsDisciplinas,
        cursoCoordenadoLogado
    ) => {

        console.log(
            "✅ AlunoService.atualizarDisciplinasDoAluno()"
        );

        const aluno =
            await this.#alunoDAO.findById(
                matricula
            );

        if (!aluno) {

            throw new ErrorResponse(
                404,
                "Aluno não encontrado!",
                {
                    message:
                        `Aluno com matrícula ${matricula} não encontrado.`
                }
            );
        }

        if (
            Number(aluno.Curso_idCurso) !==
            Number(cursoCoordenadoLogado)
        ) {

            throw new ErrorResponse(
                403,
                "Ação não permitida.",
                {
                    message:
                        "Você só pode editar alunos do curso que você coordena."
                }
            );
        }

        const idsDesejados =
            [...new Set(
                (Array.isArray(idsDisciplinas) ? idsDisciplinas : [])
                    .map(Number)
                    .filter(Number.isInteger)
            )];

        return this.#alunoDAO.atualizarDisciplinas(
            matricula,
            aluno.Curso_idCurso,
            idsDesejados
        );
    };


    // =========================================================
    // CONFERIR PERMISSÃO PARA EXCLUSÃO FORÇADA (aluno com notas)
    // Só coordenador, do curso do aluno, com a própria senha.
    // =========================================================

    #validarExclusaoForcada = async (
        matricula,
        registroProfessor,
        cursoCoordenado,
        senha
    ) => {

        if (
            senha === undefined ||
            senha === null ||
            String(senha).trim() === ""
        ) {

            throw new ErrorResponse(
                400,
                "Senha não informada.",
                {
                    message:
                        "Digite a sua senha para excluir um aluno com notas."
                }
            );
        }

        const professor =
            await this.#professorDAO.findById(
                registroProfessor
            );

        if (
            !professor ||
            Number(professor.coordenador) !== 1
        ) {

            throw new ErrorResponse(
                403,
                "Ação não permitida.",
                {
                    message:
                        "Somente coordenadores podem excluir alunos com notas."
                }
            );
        }

        const senhaValida =
            professor.senha
                ? await bcrypt.compare(
                    String(senha),
                    String(professor.senha)
                )
                : false;

        if (!senhaValida) {

            throw new ErrorResponse(
                401,
                "Senha incorreta.",
                {
                    message:
                        "A senha informada não confere com a senha do coordenador."
                }
            );
        }

        const aluno =
            await this.#alunoDAO.findById(
                matricula
            );

        if (!aluno) {

            throw new ErrorResponse(
                404,
                "Aluno não encontrado!",
                {
                    message:
                        `Aluno com matrícula ${matricula} não encontrado.`
                }
            );
        }

        if (
            Number(aluno.Curso_idCurso) !==
            Number(cursoCoordenado)
        ) {

            throw new ErrorResponse(
                403,
                "Ação não permitida.",
                {
                    message:
                        "Você só pode excluir alunos do curso que você coordena."
                }
            );
        }
    };


    // =========================================================
    // DELETAR
    //
    // Sem opções: só exclui aluno sem notas.
    // opcoes = { forcar: true, registro, cursoCoordenado, senha }:
    // exclui mesmo com notas, depois de conferir a senha.
    // =========================================================

    delete = async (matricula, opcoes = {}) => {

        console.log(
            "✅ AlunoService.delete()"
        );

        const forcar =
            opcoes.forcar === true;

        if (forcar) {

            await this.#validarExclusaoForcada(
                matricula,
                opcoes.registro,
                opcoes.cursoCoordenado,
                opcoes.senha
            );
        }

        const objAlunoModel =
            new Aluno();

        objAlunoModel.matricula =
            matricula;

        return this.#alunoDAO.delete(
            objAlunoModel,
            forcar
        );
    };


    // =========================================================
    // LIMPAR TODOS
    // (limpa apenas os alunos do curso coordenado por quem
    // está pedindo a limpeza)
    // =========================================================

    limparTodos = async (
        registroProfessor,
        senha
    ) => {

        console.log(
            "🟢 AlunoService.limparTodos()"
        );

        try {

            // -------------------------------------------------
            // VALIDAR DADOS
            // -------------------------------------------------

            if (
                registroProfessor === undefined ||
                registroProfessor === null ||
                String(registroProfessor).trim() === ""
            ) {

                throw new ErrorResponse(
                    400,
                    "Registro do coordenador não informado."
                );
            }


            if (
                senha === undefined ||
                senha === null ||
                String(senha).trim() === ""
            ) {

                throw new ErrorResponse(
                    400,
                    "Senha do coordenador não informada."
                );
            }


            console.log(
                "🔎 Buscando coordenador:",
                registroProfessor
            );


            // -------------------------------------------------
            // BUSCAR PROFESSOR
            // -------------------------------------------------

            const professor =
                await this.#professorDAO.findById(
                    registroProfessor
                );


            console.log(
                "👨‍🏫 Coordenador encontrado:",
                professor
            );


            if (!professor) {

                throw new ErrorResponse(
                    404,
                    "Professor não encontrado.",
                    {
                        message:
                            "O registro informado não pertence a um professor cadastrado."
                    }
                );
            }


            // -------------------------------------------------
            // VERIFICAR SE É COORDENADOR
            // -------------------------------------------------

            if (
                Number(professor.coordenador) !== 1
            ) {

                throw new ErrorResponse(
                    403,
                    "Ação não permitida.",
                    {
                        message:
                            "Somente coordenadores podem limpar os registros de alunos."
                    }
                );
            }


            // -------------------------------------------------
            // VERIFICAR SE COORDENA UM CURSO
            // -------------------------------------------------

            const idCurso =
                Number(
                    professor.CursoCoordenado_idCurso
                );


            if (
                !Number.isInteger(idCurso) ||
                idCurso <= 0
            ) {

                throw new ErrorResponse(
                    403,
                    "Ação não permitida.",
                    {
                        message:
                            "Você não coordena nenhum curso."
                    }
                );
            }


            // -------------------------------------------------
            // VERIFICAR SENHA
            // -------------------------------------------------

            if (!professor.senha) {

                throw new ErrorResponse(
                    401,
                    "Senha do coordenador não encontrada.",
                    {
                        message:
                            "O professor não possui uma senha cadastrada."
                    }
                );
            }


            const senhaValida =
                await bcrypt.compare(
                    String(senha),
                    String(professor.senha)
                );


            if (!senhaValida) {

                throw new ErrorResponse(
                    401,
                    "Senha incorreta.",
                    {
                        message:
                            "A senha informada não confere com a senha do coordenador."
                    }
                );
            }


            // -------------------------------------------------
            // LIMPAR ALUNOS DO CURSO COORDENADO
            // -------------------------------------------------

            console.log(
                "🧹 Iniciando limpeza dos alunos do curso:",
                idCurso
            );


            const quantidade =
                await this.#alunoDAO.limparAlunosDoCurso(
                    idCurso
                );


            console.log(
                "✅ Alunos removidos:",
                quantidade
            );


            // -------------------------------------------------
            // HISTÓRICO
            // -------------------------------------------------

            if (
                this.#historicoCoordenadorDAO
            ) {

                await this.#historicoCoordenadorDAO.registrar(

                    registroProfessor,

                    "Limpeza de registros de alunos",

                    `${quantidade} aluno(s) do curso que coordena removido(s), junto com notas, contestações e vínculos com disciplinas.`
                );

            }


            // -------------------------------------------------
            // RETORNAR QUANTIDADE
            // -------------------------------------------------

            return quantidade;


        } catch (error) {

            console.error(
                "❌ Erro em AlunoService.limparTodos():",
                error
            );


            if (
                error instanceof ErrorResponse
            ) {

                throw error;
            }


            throw new ErrorResponse(
                500,
                "Erro ao limpar registros de alunos.",
                {
                    message:
                        error.message
                }
            );
        }
    };

};