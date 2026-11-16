module.exports = class SolicitacaoTransferenciaDAO {

    #database;


    constructor(databaseInstance) {

        console.log(
            "✅ SolicitacaoTransferenciaDAO.constructor()"
        );

        this.#database =
            databaseInstance;
    }


    // =========================================================
    // CRIAR
    // =========================================================

    create = async (dados) => {

        console.log(
            "🟢 SolicitacaoTransferenciaDAO.create()"
        );


        const SQL = "INSERT INTO solicitacaotransferencia (matricula, idCursoOrigem, idCursoDestino, idTurmaDestino, solicitadoPor) VALUES (?, ?, ?, ?, ?)";


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                [
                    dados.matricula,
                    dados.idCursoOrigem,
                    dados.idCursoDestino,
                    dados.idTurmaDestino,
                    dados.solicitadoPor
                ]
            );


        return resultado.insertId;
    };


    // =========================================================
    // BUSCAR POR ID
    // =========================================================

    findById = async (idSolicitacao) => {

        const SQL = `
            SELECT *
            FROM solicitacaotransferencia
            WHERE idSolicitacao = ?
            LIMIT 1
        `;


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                [idSolicitacao]
            );


        return resultado[0] || null;
    };


    // =========================================================
    // JÁ EXISTE PEDIDO PENDENTE PARA O ALUNO?
    // =========================================================

    findPendenteByMatricula = async (matricula) => {

        const SQL = `
            SELECT *
            FROM solicitacaotransferencia
            WHERE matricula = ?
              AND status = 'Pendente'
            LIMIT 1
        `;


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                [matricula]
            );


        return resultado[0] || null;
    };


    // =========================================================
    // SOLICITAÇÕES DE UM CURSO (recebidas e enviadas)
    // =========================================================

    findRelacionadas = async (idCurso) => {

        console.log(
            "🟢 SolicitacaoTransferenciaDAO.findRelacionadas():",
            idCurso
        );


        const SQL = `
            SELECT
                s.idSolicitacao,
                s.matricula,
                a.nome AS nomeAluno,
                s.idCursoOrigem,
                co.nomeCurso AS nomeCursoOrigem,
                s.idCursoDestino,
                cd.nomeCurso AS nomeCursoDestino,
                s.idTurmaDestino,
                t.nomeTurma AS nomeTurmaDestino,
                COALESCE(p.nome, '—') AS nomeSolicitante,
                s.status,
                s.dataSolicitacao,
                s.dataResposta

            FROM solicitacaotransferencia s

            INNER JOIN aluno a
                ON a.matricula = s.matricula

            LEFT JOIN curso co
                ON co.idCurso = s.idCursoOrigem

            LEFT JOIN curso cd
                ON cd.idCurso = s.idCursoDestino

            LEFT JOIN turma t
                ON t.idTurma = s.idTurmaDestino

            LEFT JOIN professor p
                ON p.registro = s.solicitadoPor

            WHERE s.idCursoDestino = ?
               OR s.idCursoOrigem = ?

            ORDER BY
                (s.status = 'Pendente') DESC,
                s.dataSolicitacao DESC
        `;


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                [
                    idCurso,
                    idCurso
                ]
            );


        return resultado;
    };


    // =========================================================
    // RESPONDER (Aceita / Recusada)
    // =========================================================

    responder = async (
        idSolicitacao,
        status,
        registro
    ) => {

        console.log(
            "🟢 SolicitacaoTransferenciaDAO.responder():",
            idSolicitacao,
            status
        );


        const SQL = `
            UPDATE solicitacaotransferencia
            SET
                status = ?,
                respondidoPor = ?,
                dataResposta = NOW()
            WHERE idSolicitacao = ?
              AND status = 'Pendente'
        `;


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                [
                    status,
                    registro,
                    idSolicitacao
                ]
            );


        return resultado.affectedRows > 0;
    };


    // =========================================================
    // QUANTIDADE DE NOTAS LANÇADAS DO ALUNO
    // =========================================================

    contarNotasDoAluno = async (matricula) => {

        const SQL = `
            SELECT COUNT(*) AS total
            FROM nota n

            INNER JOIN alunodisciplinaprofessor adp
                ON adp.idAlunoDisciplinaProfessor =
                   n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor

            WHERE adp.Aluno_matricula = ?
              AND n.nota IS NOT NULL
        `;


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                [matricula]
            );


        return Number(
            resultado[0]?.total || 0
        );
    };


    // =========================================================
    // GARANTIR OS VÍNCULOS COM AS DISCIPLINAS DO CURSO NOVO
    // (idempotente: só cria o que ainda não existe; usado para
    // retomar uma aceitação que falhou no meio do caminho)
    // =========================================================

    garantirVinculosDoCurso = async (
        matricula,
        idCurso
    ) => {

        console.log(
            "🟢 SolicitacaoTransferenciaDAO.garantirVinculosDoCurso():",
            matricula,
            idCurso
        );


        const SQL = `
            INSERT INTO alunodisciplinaprofessor
                (Disciplina_idDisciplina, Aluno_matricula)
            SELECT d.idDisciplina, ?
            FROM disciplina d
            WHERE d.Curso_idCurso = ?
              AND NOT EXISTS (
                  SELECT 1
                  FROM alunodisciplinaprofessor adp
                  WHERE adp.Aluno_matricula = ?
                    AND adp.Disciplina_idDisciplina = d.idDisciplina
              )
        `;


        const pool =
            await this.#database.getPool();


        await pool.execute(
            SQL,
            [
                matricula,
                idCurso,
                matricula
            ]
        );
    };


    // =========================================================
    // REMOVER VÍNCULOS COM AS DISCIPLINAS DO CURSO ANTIGO
    // (o aluno não tem notas; só sobram notas vazias, se houver)
    // =========================================================

    removerVinculosDoCurso = async (
        matricula,
        idCurso
    ) => {

        console.log(
            "🗑️ SolicitacaoTransferenciaDAO.removerVinculosDoCurso():",
            matricula,
            idCurso
        );


        const pool =
            await this.#database.getPool();


        const conexao =
            await pool.getConnection();


        try {

            await conexao.beginTransaction();


            await conexao.execute(`
                DELETE n
                FROM nota n

                INNER JOIN alunodisciplinaprofessor adp
                    ON adp.idAlunoDisciplinaProfessor =
                       n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor

                INNER JOIN disciplina d
                    ON d.idDisciplina = adp.Disciplina_idDisciplina

                WHERE adp.Aluno_matricula = ?
                  AND d.Curso_idCurso = ?
                  AND n.nota IS NULL
            `, [matricula, idCurso]);


            await conexao.execute(`
                DELETE adp
                FROM alunodisciplinaprofessor adp

                INNER JOIN disciplina d
                    ON d.idDisciplina = adp.Disciplina_idDisciplina

                WHERE adp.Aluno_matricula = ?
                  AND d.Curso_idCurso = ?
            `, [matricula, idCurso]);


            await conexao.commit();

        } catch (error) {

            try {

                await conexao.rollback();

            } catch (rollbackError) {

                console.error(
                    "❌ Erro no rollback:",
                    rollbackError
                );
            }

            throw error;

        } finally {

            conexao.release();
        }
    };

};