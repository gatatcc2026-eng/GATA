const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class SolicitacaoProfessorDAO {

    #database;


    constructor(databaseInstance) {

        console.log(
            "✅ SolicitacaoProfessorDAO.constructor()"
        );

        this.#database =
            databaseInstance;
    }


    // =========================================================
    // CRIAR
    // (os triggers barram: professor fora da origem, professor
    // já no destino e pedido pendente repetido)
    // =========================================================

    create = async (dados) => {

        console.log(
            "🟢 SolicitacaoProfessorDAO.create()"
        );


        const SQL = "INSERT INTO solicitacaoprofessor (registroProfessor, idCursoOrigem, idCursoDestino, solicitadoPor) VALUES (?, ?, ?, ?)";


        const pool =
            await this.#database.getPool();


        try {

            const [
                resultado
            ] =
                await pool.execute(
                    SQL,
                    [
                        dados.registroProfessor,
                        dados.idCursoOrigem,
                        dados.idCursoDestino,
                        dados.solicitadoPor
                    ]
                );


            return resultado.insertId;

        } catch (error) {

            if (error.sqlState === "45000") {

                throw new ErrorResponse(
                    409,
                    error.sqlMessage ||
                    "Não foi possível criar a solicitação."
                );
            }

            throw error;
        }
    };


    // =========================================================
    // BUSCAR POR ID
    // =========================================================

    findById = async (idSolicitacao) => {

        const SQL = `
            SELECT *
            FROM solicitacaoprofessor
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
    // JÁ EXISTE PEDIDO PENDENTE DESTE PROFESSOR PARA O CURSO?
    // =========================================================

    findPendente = async (registroProfessor, idCursoDestino) => {

        const SQL = `
            SELECT *
            FROM solicitacaoprofessor
            WHERE registroProfessor = ?
              AND idCursoDestino = ?
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
                [
                    registroProfessor,
                    idCursoDestino
                ]
            );


        return resultado[0] || null;
    };


    // =========================================================
    // SOLICITAÇÕES DE UM CURSO (recebidas e enviadas)
    //
    // Recebidas = idCursoOrigem (o coordenador daqui aprova)
    // Enviadas  = idCursoDestino (o coordenador daqui pediu)
    // =========================================================

    findRelacionadas = async (idCurso) => {

        console.log(
            "🟢 SolicitacaoProfessorDAO.findRelacionadas():",
            idCurso
        );


        const SQL = `
            SELECT
                s.idSolicitacao,
                s.registroProfessor,
                p.nome AS nomeProfessor,
                s.idCursoOrigem,
                co.nomeCurso AS nomeCursoOrigem,
                s.idCursoDestino,
                cd.nomeCurso AS nomeCursoDestino,
                COALESCE(ps.nome, '—') AS nomeSolicitante,
                COALESCE(pr.nome, '—') AS nomeRespondente,
                s.status,
                s.dataSolicitacao,
                s.dataResposta

            FROM solicitacaoprofessor s

            INNER JOIN professor p
                ON p.registro = s.registroProfessor

            LEFT JOIN curso co
                ON co.idCurso = s.idCursoOrigem

            LEFT JOIN curso cd
                ON cd.idCurso = s.idCursoDestino

            LEFT JOIN professor ps
                ON ps.registro = s.solicitadoPor

            LEFT JOIN professor pr
                ON pr.registro = s.respondidoPor

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
    // QUANTIDADE DE PEDIDOS PENDENTES PARA APROVAR (origem)
    // =========================================================

    contarPendentesParaOrigem = async (idCurso) => {

        const SQL = `
            SELECT COUNT(*) AS total
            FROM solicitacaoprofessor
            WHERE idCursoOrigem = ?
              AND status = 'Pendente'
        `;


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                [idCurso]
            );


        return Number(
            resultado[0]?.total || 0
        );
    };


    // =========================================================
    // ACEITAR
    //
    // Numa transação só: marca a solicitação como Aceita e
    // vincula o professor ao curso de destino. Se algo falhar,
    // volta tudo. Quem pode aceitar (coordenador da origem) é
    // validado no Service.
    // =========================================================

    aceitar = async (idSolicitacao, registroResponsavel) => {

        console.log(
            "🟢 SolicitacaoProfessorDAO.aceitar():",
            idSolicitacao
        );


        const pool =
            await this.#database.getPool();


        const conexao =
            await pool.getConnection();


        try {

            await conexao.beginTransaction();


            const [linhas] =
                await conexao.execute(`
                    SELECT registroProfessor, idCursoDestino
                    FROM solicitacaoprofessor
                    WHERE idSolicitacao = ?
                      AND status = 'Pendente'
                    FOR UPDATE
                `, [idSolicitacao]);


            if (linhas.length === 0) {

                await conexao.rollback();

                return false;
            }


            const {
                registroProfessor,
                idCursoDestino
            } = linhas[0];


            await conexao.execute(`
                UPDATE solicitacaoprofessor
                SET
                    status = 'Aceita',
                    respondidoPor = ?,
                    dataResposta = NOW()
                WHERE idSolicitacao = ?
            `, [
                registroResponsavel,
                idSolicitacao
            ]);


            await conexao.execute(`
                INSERT IGNORE INTO professor_curso
                    (registro, idCurso)
                VALUES (?, ?)
            `, [
                registroProfessor,
                idCursoDestino
            ]);


            await conexao.commit();

            return true;

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


    // =========================================================
    // RECUSAR
    // =========================================================

    recusar = async (idSolicitacao, registroResponsavel) => {

        console.log(
            "🟢 SolicitacaoProfessorDAO.recusar():",
            idSolicitacao
        );


        const SQL = `
            UPDATE solicitacaoprofessor
            SET
                status = 'Recusada',
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
                    registroResponsavel,
                    idSolicitacao
                ]
            );


        return resultado.affectedRows > 0;
    };

};  