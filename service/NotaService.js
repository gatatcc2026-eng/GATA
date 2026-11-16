const NotaDAO = require("../dao/NotaDAO");
const Nota = require("../model/Nota");
const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class NotaService {

    #NotaDAO;
    #travaNotasDAO;
    #historicoCoordenadorDAO;

    constructor(
        NotaDAODependency,
        travaNotasDAODependency,
        historicoCoordenadorDAODependency
    ) {

        console.log(
            "✅ NotaService.constructor()"
        );

        this.#NotaDAO =
            NotaDAODependency;

        this.#travaNotasDAO =
            travaNotasDAODependency;

        this.#historicoCoordenadorDAO =
            historicoCoordenadorDAODependency;
    }


    // =====================================================
    // NOTAS FECHADAS? (POR CURSO)
    //
    // Descobre o curso da disciplina do vínculo aluno/disciplina
    // e verifica se as notas DESSE curso estão fechadas.
    // Se estiverem, só o coordenador pode lançar, alterar
    // ou apagar notas.
    // "usuario" é o req.user (JWT).
    // =====================================================

    #validarNotasAbertas = async (usuario, idAdp) => {

        if (!this.#travaNotasDAO || !idAdp) {

            return;
        }

        const idCurso =
            await this.#travaNotasDAO.cursoDaAdp(
                idAdp
            );

        const fechadas =
            await this.#travaNotasDAO.notasFechadas(
                idCurso
            );

        if (!fechadas) {

            return;
        }

        const ehCoordenador =
            usuario?.coordenador === true ||
            Number(usuario?.coordenador) === 1;

        if (ehCoordenador) {

            return;
        }

        throw new ErrorResponse(
            403,
            "Notas fechadas.",
            {
                message:
                    "As notas deste curso foram fechadas pelo coordenador. Não é possível lançar ou alterar notas."
            }
        );
    };


    // =====================================================
    // AVISA O COORDENADOR DO CURSO
    //
    // Grava no histórico do coordenador qual aluno, turma e
    // disciplina tiveram a nota alterada. Se quem alterou já
    // é coordenador daquele curso, não registra (não faz
    // sentido avisar a si mesmo).
    // =====================================================

    #notificarCoordenador = async (
        idNota,
        notaAnterior,
        notaNova,
        bimestre,
        usuario
    ) => {

        if (!this.#historicoCoordenadorDAO) {

            console.warn(
                "⚠️ NotaService: HistoricoCoordenadorDAO não foi injetado, histórico não gravado."
            );

            return;
        }

        const registro = usuario?.registro;

        if (!registro) {

            console.warn(
                "⚠️ NotaService: usuário sem registro no token, histórico não gravado."
            );

            return;
        }

        const contexto =
            await this.#historicoCoordenadorDAO
                .buscarContextoNota(idNota);

        if (!contexto) {

            return;
        }

        const idCurso =
            Number(contexto.idCurso);

        const cursosCoordenados =
            await this.#historicoCoordenadorDAO
                .cursosDoCoordenador(registro);

        if (cursosCoordenados.includes(idCurso)) {

            return;
        }

        const fmt = (valor) =>
            String(valor).replace(".", ",");

        const descricao =
            `Alterou a nota de ${contexto.nomeAluno} ` +
            `(turma ${contexto.nomeTurma}) em ` +
            `${contexto.nomeDisciplina}, ${bimestre}: ` +
            `de ${fmt(notaAnterior)} para ${fmt(notaNova)}.`;

        await this.#historicoCoordenadorDAO.registrar(
            registro,
            "Nota alterada",
            descricao,
            idCurso
        );
    };


    // =====================================================
    // CREATE
    // =====================================================

    createNota = async (notaJson, usuario) => {

        console.log(
            "✅ NotaService.createNota()"
        );

        if (
            notaJson.nota === undefined ||
            notaJson.bimestre === undefined ||
            notaJson.idAlunoDisciplinaProfessor === undefined
        ) {

            throw new Error(
                "nota, bimestre e idAlunoDisciplinaProfessor são obrigatórios!"
            );
        }

        await this.#validarNotasAbertas(
            usuario,
            Number(
                notaJson.idAlunoDisciplinaProfessor
            )
        );

        const objNotaModel =
            new Nota();

        objNotaModel.nota =
            Number(notaJson.nota);

        objNotaModel.bimestre =
            notaJson.bimestre;

        objNotaModel.alunoDisciplinaProfessor = {

            idAlunoDisciplinaProfessor:
                Number(
                    notaJson.idAlunoDisciplinaProfessor
                )

        };

        return await this.#NotaDAO.create(
            objNotaModel
        );
    };


    // =====================================================
    // FIND ALL
    // =====================================================

    findAll = async () => {

        console.log(
            "🟢 NotaService.findAll()"
        );

        return await this.#NotaDAO.findAll();
    };


    // =====================================================
    // FIND BY ID
    // =====================================================

    findById = async (idNota) => {

        console.log(
            "🟢 NotaService.findById()"
        );

        return await this.#NotaDAO.findById(
            idNota
        );
    };


    // =====================================================
    // FIND BY FIELD
    // =====================================================

    findByField = async (field, value) => {

        console.log(
            "✅ NotaService.findByField()"
        );

        const allowedFields = [

            "idNota",

            "nota",

            "bimestre",

            "AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor"

        ];

        if (
            !allowedFields.includes(field)
        ) {

            throw new Error(
                "Campo inválido para busca."
            );
        }

        return await this.#NotaDAO.findByField(
            field,
            value
        );
    };


    // =====================================================
    // UPDATE
    // =====================================================

    updateNota = async (notaJson, usuario) => {

        console.log(
            "✅ NotaService.updateNota()"
        );

        const {
            idNota,
            nota,
            bimestre,
            idAlunoDisciplinaProfessor
        } = notaJson;

        if (!idNota) {

            throw new Error(
                "idNota é obrigatório!"
            );
        }

        const notaAtual =
            await this.#NotaDAO.findById(
                idNota
            );

        if (!notaAtual) {

            throw new Error(
                `Nota com ID ${idNota} não encontrada!`
            );
        }

        await this.#validarNotasAbertas(
            usuario,
            Number(
                notaAtual
                    .AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor
            )
        );

        const objNotaModel =
            new Nota();

        objNotaModel.idNota =
            Number(idNota);

        objNotaModel.nota =
            nota !== undefined
                ? Number(nota)
                : notaAtual.nota;

        objNotaModel.bimestre =
            bimestre !== undefined
                ? bimestre
                : notaAtual.bimestre;

        objNotaModel.alunoDisciplinaProfessor = {

            idAlunoDisciplinaProfessor:

                idAlunoDisciplinaProfessor !== undefined

                    ? Number(
                        idAlunoDisciplinaProfessor
                    )

                    : Number(
                        notaAtual
                            .AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor
                    )

        };

        const resultado =
            await this.#NotaDAO.update(
                objNotaModel.idNota,
                objNotaModel
            );

        // só avisa se o valor da nota realmente mudou
        if (Number(notaAtual.nota) !== objNotaModel.nota) {

            try {

                await this.#notificarCoordenador(
                    objNotaModel.idNota,
                    notaAtual.nota,
                    objNotaModel.nota,
                    objNotaModel.bimestre,
                    usuario
                );

            } catch (error) {

                // a nota já foi salva; falha no aviso não pode derrubar a requisição
                console.error(
                    "❌ Não foi possível registrar no histórico do coordenador:",
                    error
                );
            }
        }

        return resultado;
    };


    // =====================================================
    // DELETE
    // =====================================================

    delete = async (idNota, usuario) => {

        console.log(
            "🟢 NotaService.delete()"
        );

        if (!idNota) {

            throw new Error(
                "idNota é obrigatório!"
            );
        }

        const notaAtual =
            await this.#NotaDAO.findById(
                Number(idNota)
            );

        if (notaAtual) {

            await this.#validarNotasAbertas(
                usuario,
                Number(
                    notaAtual
                        .AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor
                )
            );
        }

        return await this.#NotaDAO.delete(
            Number(idNota)
        );
    };

};