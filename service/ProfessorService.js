const bcrypt = require("bcryptjs");
const ErrorResponse = require("../utils/ErrorResponse");
const HASH_FALSO = bcrypt.hashSync("senha-falsa-para-igualar-tempo", 10);
module.exports = class ProfessorService {

    #professorDAO;
    #professorCursoDAO;


    // =========================================================
    // CONSTRUTOR
    // =========================================================

    constructor(professorDAO, professorCursoDAO) {

        console.log(
            "✅ ProfessorService.constructor()"
        );

        this.#professorDAO =
            professorDAO;

        this.#professorCursoDAO =
            professorCursoDAO;
    }


    // =========================================================
    // AUXILIARES
    // =========================================================

    // Quem faz a ação precisa ser coordenador. Devolve o professor
    // (o curso dele é CursoCoordenado_idCurso).
    #obterCoordenador = async (registroSolicitante) => {

        const professor =
            await this.#professorDAO.findByRegistro(
                registroSolicitante
            );


        if (
            !professor ||
            professor.CursoCoordenado_idCurso === null ||
            professor.CursoCoordenado_idCurso === undefined
        ) {

            throw new ErrorResponse(
                403,
                "Apenas coordenadores podem fazer isso."
            );
        }


        return professor;
    };


    #semSenha = (professor) => {

        if (!professor) {

            return professor;
        }

        const { senha, ...resto } = professor;

        return resto;
    };


    // Existe OUTRO coordenador (diferente de registroIgnorado)
    // coordenando este curso?
    #temOutroCoordenador = async (idCurso, registroIgnorado) => {

        const todos =
            await this.#professorDAO.findAllComCursos();


        return todos.some(
            professor =>
                Number(professor.registro) !==
                    Number(registroIgnorado) &&
                Number(professor.coordenador) === 1 &&
                professor.CursoCoordenado_idCurso !== null &&
                professor.CursoCoordenado_idCurso !== undefined &&
                Number(professor.CursoCoordenado_idCurso) ===
                    Number(idCurso)
        );
    };


    // O professor coordena exatamente este curso?
    #coordenaOCurso = (professor, idCurso) => {

        return (
            Number(professor.coordenador) === 1 &&
            professor.CursoCoordenado_idCurso !== null &&
            professor.CursoCoordenado_idCurso !== undefined &&
            Number(professor.CursoCoordenado_idCurso) ===
                Number(idCurso)
        );
    };


    // =========================================================
    // LOGIN
    //
    // Devolve o professor (com a senha, o Control não a expõe).
    // Mensagem igual para registro inexistente e senha errada.
    // =========================================================

    // =========================================================
// LOGIN
// =========================================================

login = async (registro, senha) => {

    const professor =
        await this.#professorDAO.findByRegistro(registro);

    const hash = professor?.senha || HASH_FALSO;

    const senhaValida =
        await bcrypt.compare(String(senha), hash);

    if (!professor || !professor.senha || !senhaValida) {

        throw new ErrorResponse(
            401,
            "Registro ou senha inválidos!"
        );
    }

    let cursosCoordenados = [];

    if (Number(professor.coordenador) === 1) {

        cursosCoordenados =
            await this.#professorDAO.findCursosCoordenados(
                professor.registro
            );
    }

    return {
        ...this.#semSenha(professor),
        cursosCoordenados
    };
};


    // =========================================================
    // BUSCAR POR REGISTRO
    // =========================================================

    findByRegistro = async (registro) => {

        console.log(
            "🟢 ProfessorService.findByRegistro():",
            registro
        );


        return await this.#professorDAO.findByRegistro(
            Number(registro)
        );
    };


    // =========================================================
    // LISTAR TODOS COM OS CURSOS (nomes; sem senha)
    // =========================================================

    findAllComCursos = async () => {

        console.log(
            "🟢 ProfessorService.findAllComCursos()"
        );


        return await this.#professorDAO.findAllComCursos();
    };


    // =========================================================
    // LISTAR PROFESSORES DO CURSO DO COORDENADOR
    // (com nomes dos cursos; nunca devolve a senha)
    // =========================================================

    listarDoMeuCurso = async (registroSolicitante) => {

        console.log(
            "🟢 ProfessorService.listarDoMeuCurso()"
        );


        const coordenador =
            await this.#obterCoordenador(
                registroSolicitante
            );

        const idCurso =
            Number(coordenador.CursoCoordenado_idCurso);


        const todos =
            await this.#professorDAO.findAllComCursos();


        return todos.filter(
            professor =>
                professor.cursosVinculados.some(
                    curso =>
                        Number(curso.idCurso) === idCurso
                )
        );
    };


    // =========================================================
    // BUSCAR PROFESSORES QUE AINDA NÃO ESTÃO NO MEU CURSO
    // (botão "Adicionar professor existente")
    // =========================================================

    buscarDisponiveis = async (registroSolicitante, termo = "") => {

        console.log(
            "🟢 ProfessorService.buscarDisponiveis()"
        );


        const coordenador =
            await this.#obterCoordenador(
                registroSolicitante
            );


        return await this.#professorCursoDAO.findDisponiveisParaCurso(
            coordenador.CursoCoordenado_idCurso,
            termo
        );
    };

    createProfessor = async (dados, registroSolicitante) => {

        console.log(
            "🟢 ProfessorService.createProfessor()"
        );


        const coordenador =
            await this.#obterCoordenador(
                registroSolicitante
            );

        const idCurso =
            Number(coordenador.CursoCoordenado_idCurso);


        if (
            !dados ||
            !dados.registro ||
            !String(dados.nome || "").trim() ||
            !String(dados.senha || "").trim()
        ) {

            throw new ErrorResponse(
                400,
                "Informe registro, nome e senha do professor."
            );
        }


        const existente =
            await this.#professorDAO.findByRegistro(
                dados.registro
            );


        if (existente) {

            throw new ErrorResponse(
                409,
                "Já existe um professor com este registro.",
                {
                    message:
                        "Use \"Adicionar professor existente\" para pedir a entrada dele no seu curso."
                }
            );
        }


        const ehCoordenador =
            Boolean(dados.coordenador);


        const senhaHash =
            await bcrypt.hash(
                String(dados.senha).trim(),
                10
            );


        await this.#professorDAO.createProfessor({

            registro:
                dados.registro,

            nome:
                String(dados.nome).trim(),

            senha:
                senhaHash,

            telefone1:
                dados.telefone1 || null,

            email1:
                dados.email1 || null,

            coordenador:
                ehCoordenador ? 1 : 0,

            CursoCoordenado_idCurso:
                ehCoordenador ? idCurso : null
        });


        // idempotente: se o trigger já vinculou, não faz nada
        await this.#professorCursoDAO.vincular(
            dados.registro,
            idCurso
        );


        return this.#semSenha(
            await this.#professorDAO.findByRegistro(
                dados.registro
            )
        );
    };


    // =========================================================
    // ATUALIZAR PROFESSOR
    //
    // Regras:
    // - só professor vinculado ao curso do coordenador
    // - se o professor coordena OUTRO curso, esse campo não muda
    // - o coordenador não pode remover a própria coordenação
    // - senha em branco mantém a atual; senha nova é salva com hash
    // =========================================================

    updateProfessor = async (dados, registroSolicitante) => {

        console.log(
            "🟢 ProfessorService.updateProfessor()"
        );


        const coordenador =
            await this.#obterCoordenador(
                registroSolicitante
            );

        const idCurso =
            Number(coordenador.CursoCoordenado_idCurso);


        if (!dados || !dados.registro) {

            throw new ErrorResponse(
                400,
                "Informe o registro do professor."
            );
        }


        const atual =
            await this.#professorDAO.findByRegistro(
                dados.registro
            );


        if (!atual) {

            throw new ErrorResponse(
                404,
                "Professor não encontrado."
            );
        }


        const vinculado =
            await this.#professorCursoDAO.existeVinculo(
                atual.registro,
                idCurso
            );


        if (!vinculado) {

            throw new ErrorResponse(
                403,
                "Você só pode editar professores do seu curso."
            );
        }


        const cursoCoordenadoAtual =
            atual.CursoCoordenado_idCurso === null ||
            atual.CursoCoordenado_idCurso === undefined
                ? null
                : Number(atual.CursoCoordenado_idCurso);


        let novoCursoCoordenado;

        if (
            cursoCoordenadoAtual !== null &&
            cursoCoordenadoAtual !== idCurso
        ) {

            // coordena outro curso: não é decisão deste coordenador
            novoCursoCoordenado =
                cursoCoordenadoAtual;

        } else {

            novoCursoCoordenado =
                dados.coordenador
                    ? idCurso
                    : null;
        }


        if (
            Number(atual.registro) === Number(registroSolicitante) &&
            novoCursoCoordenado === null
        ) {

            throw new ErrorResponse(
                409,
                "Você não pode remover a sua própria coordenação."
            );
        }


        const senhaNova =
            String(dados.senha || "").trim();

        const senhaFinal =
            senhaNova
                ? await bcrypt.hash(senhaNova, 10)
                : atual.senha;


        await this.#professorDAO.updateProfessor({

            registro:
                atual.registro,

            nome:
                String(dados.nome || "").trim() ||
                atual.nome,

            senha:
                senhaFinal,

            telefone1:
                dados.telefone1 !== undefined
                    ? dados.telefone1
                    : atual.telefone1,

            email1:
                dados.email1 !== undefined
                    ? dados.email1
                    : atual.email1,

            coordenador:
                novoCursoCoordenado !== null ? 1 : 0,

            CursoCoordenado_idCurso:
                novoCursoCoordenado
        });


        return this.#semSenha(
            await this.#professorDAO.findByRegistro(
                atual.registro
            )
        );
    };


    // =========================================================
    // EXCLUIR PROFESSOR
    //
    // Regras:
    // - só apaga o cadastro se o professor estiver SOMENTE no
    //   curso do coordenador (em outros cursos, use removerDoCurso)
    // - para excluir um COORDENADOR do curso (inclusive você
    //   mesmo), precisa existir pelo menos OUTRO coordenador
    //   neste curso; o curso nunca fica sem coordenador
    // =========================================================

    deleteProfessor = async (registro, registroSolicitante) => {

        console.log(
            "🟢 ProfessorService.deleteProfessor():",
            registro
        );


        const coordenador =
            await this.#obterCoordenador(
                registroSolicitante
            );

        const idCurso =
            Number(coordenador.CursoCoordenado_idCurso);


        const professor =
            await this.#professorDAO.findByRegistro(
                registro
            );


        if (!professor) {

            throw new ErrorResponse(
                404,
                "Professor não encontrado."
            );
        }


        const cursos =
            await this.#professorCursoDAO.findCursosByProfessor(
                professor.registro
            );


        if (
            !cursos.some(
                curso =>
                    Number(curso.idCurso) === idCurso
            )
        ) {

            throw new ErrorResponse(
                403,
                "Você só pode excluir professores do seu curso."
            );
        }


        if (cursos.length > 1) {

            throw new ErrorResponse(
                409,
                "Este professor também atua em outros cursos.",
                {
                    message:
                        "Use \"Remover do curso\" para tirá-lo apenas do seu curso. O cadastro continua nos demais."
                }
            );
        }


        if (this.#coordenaOCurso(professor, idCurso)) {

            const temOutro =
                await this.#temOutroCoordenador(
                    idCurso,
                    professor.registro
                );


            if (!temOutro) {

                throw new ErrorResponse(
                    409,
                    "Este é o único coordenador do curso.",
                    {
                        message:
                            "Cadastre outro coordenador antes de excluir este."
                    }
                );
            }
        }


        return await this.#professorDAO.deleteProfessor(
            professor.registro
        );
    };


    // =========================================================
    // REMOVER PROFESSOR DO MEU CURSO (sem apagar o cadastro)
    //
    // Regras:
    // - só professor vinculado ao curso do coordenador
    // - não pode ser o ÚLTIMO curso do professor (ele ficaria sem
    //   curso e ninguém poderia aprovar um pedido para ele);
    //   nesse caso use "Excluir"
    // - se ele ainda leciona disciplina neste curso, bloqueia
    //   (troque o professor da disciplina antes)
    // - se ele coordena este curso, precisa existir OUTRO
    //   coordenador; a coordenação é limpa ao sair
    // =========================================================

    removerDoCurso = async (registro, registroSolicitante) => {

        console.log(
            "🟢 ProfessorService.removerDoCurso():",
            registro
        );


        const coordenador =
            await this.#obterCoordenador(
                registroSolicitante
            );

        const idCurso =
            Number(coordenador.CursoCoordenado_idCurso);


        const professor =
            await this.#professorDAO.findByRegistro(
                registro
            );


        if (!professor) {

            throw new ErrorResponse(
                404,
                "Professor não encontrado."
            );
        }


        const cursos =
            await this.#professorCursoDAO.findCursosByProfessor(
                professor.registro
            );


        if (
            !cursos.some(
                curso =>
                    Number(curso.idCurso) === idCurso
            )
        ) {

            throw new ErrorResponse(
                404,
                "Este professor não está vinculado ao seu curso."
            );
        }


        // 1) último curso: não deixa o professor "vagando"
        if (cursos.length <= 1) {

            throw new ErrorResponse(
                409,
                "Este é o único curso do professor.",
                {
                    message:
                        "Ele ficaria sem curso. Use \"Excluir\" para apagar o cadastro, ou adicione-o antes a outro curso."
                }
            );
        }


        // 2) ainda leciona disciplina neste curso
        const todos =
            await this.#professorDAO.findAllComCursos();

        const dadosProfessor =
            todos.find(
                p =>
                    Number(p.registro) ===
                    Number(professor.registro)
            );

        const lecionaNoCurso =
            (dadosProfessor?.cursosLeciona || []).some(
                curso =>
                    Number(curso.idCurso) === idCurso
            );


        if (lecionaNoCurso) {

            throw new ErrorResponse(
                409,
                "Este professor ainda leciona neste curso.",
                {
                    message:
                        "Troque o professor das disciplinas dele neste curso antes de removê-lo."
                }
            );
        }


        // 3) coordena este curso: precisa de outro coordenador
        const eraCoordenadorDoCurso =
            this.#coordenaOCurso(professor, idCurso);


        if (eraCoordenadorDoCurso) {

            const temOutro =
                await this.#temOutroCoordenador(
                    idCurso,
                    professor.registro
                );


            if (!temOutro) {

                throw new ErrorResponse(
                    409,
                    "Este é o único coordenador do curso.",
                    {
                        message:
                            "Cadastre outro coordenador (editar ou cadastrar professor) antes de sair do curso."
                    }
                );
            }


            // limpa a coordenação antes de desvincular
            await this.#professorDAO.updateProfessor({

                registro:
                    professor.registro,

                nome:
                    professor.nome,

                senha:
                    professor.senha,

                telefone1:
                    professor.telefone1,

                email1:
                    professor.email1,

                coordenador:
                    0,

                CursoCoordenado_idCurso:
                    null
            });
        }


        try {

            return await this.#professorCursoDAO.desvincular(
                professor.registro,
                idCurso
            );

        } catch (error) {

            // desfaz a limpeza da coordenação se o vínculo não saiu
            if (eraCoordenadorDoCurso) {

                await this.#professorDAO.updateProfessor({

                    registro:
                        professor.registro,

                    nome:
                        professor.nome,

                    senha:
                        professor.senha,

                    telefone1:
                        professor.telefone1,

                    email1:
                        professor.email1,

                    coordenador:
                        professor.coordenador,

                    CursoCoordenado_idCurso:
                        professor.CursoCoordenado_idCurso
                });
            }

            throw error;
        }
    };

};