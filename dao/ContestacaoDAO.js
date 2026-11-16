const JOIN_NOTA = `
    LEFT JOIN alunodisciplinaprofessor adpn
        ON adpn.Aluno_matricula = c.matricula
        AND adpn.Disciplina_idDisciplina = c.idDisciplina
    LEFT JOIN nota n
        ON n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor = adpn.idAlunoDisciplinaProfessor
        AND n.bimestre = c.bimestre
`;

const COLUNAS_NOTA = `
    COALESCE(
        c.notaOriginal,
        CASE WHEN c.status IN ('Em análise', 'Pendente') THEN n.nota END
    ) AS notaAnterior,
    n.nota AS notaAtual
`;

module.exports = class ContestacaoDAO {
    #database;

    constructor(databaseInstance) {
        console.log("✅ ContestacaoDAO.constructor()");
        this.#database = databaseInstance;
    }
    buscarDadosProfessor = async (matricula, idDisciplina) => {
        console.log("🟢 ContestacaoDAO.buscarDadosProfessor()");

        const SQL = `
            SELECT
                a.nome AS alunoNome,
                a.matricula AS matricula,
                d.nomeDisciplina AS nomeDisciplina,
                p.registro AS registroProfessor,
                p.nome AS professorNome,
                p.email1 AS emailProfessor
            FROM aluno a
            INNER JOIN disciplina d ON d.idDisciplina = ?
            INNER JOIN turma_disciplina_professor tdp
                ON tdp.idDisciplina = d.idDisciplina
                AND tdp.idTurma = a.Turma_idTurma
            INNER JOIN professor p ON p.registro = tdp.Professor_registro
            WHERE a.matricula = ?;
        `;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [idDisciplina, matricula]);

        return resultado[0] || null;
    };

    /**
     * As notas do curso desta disciplina estão fechadas pelo coordenador?
     * (mesma regra do BloqueioNotasMiddleware: a trava é por curso,
     * e o curso vem de disciplina.Curso_idCurso)
     */
    notasFechadasDaDisciplina = async (idDisciplina) => {
        console.log("🟢 ContestacaoDAO.notasFechadasDaDisciplina()");

        const SQL = `
            SELECT 1 AS fechada
            FROM disciplina d
            INNER JOIN configuracaonotascurso cfg ON cfg.idCurso = d.Curso_idCurso
            WHERE d.idDisciplina = ?
            AND cfg.notasFechadas = 1
            LIMIT 1;
        `;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [idDisciplina]);

        return resultado.length > 0;
    };

    /**
     * Ids das disciplinas do aluno cujo curso está com as notas fechadas.
     * O front usa isso para desativar o botão "Contestar".
     */
    buscarDisciplinasTravadasDoAluno = async (matricula) => {
        console.log("🟢 ContestacaoDAO.buscarDisciplinasTravadasDoAluno()");

        const SQL = `
            SELECT DISTINCT d.idDisciplina
            FROM alunodisciplinaprofessor adp
            INNER JOIN disciplina d ON d.idDisciplina = adp.Disciplina_idDisciplina
            INNER JOIN configuracaonotascurso cfg ON cfg.idCurso = d.Curso_idCurso
            WHERE adp.Aluno_matricula = ?
            AND cfg.notasFechadas = 1;
        `;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [matricula]);

        return (resultado || []).map(linha => Number(linha.idDisciplina));
    };

    /**
     * Quantas contestações "Em análise" esperam resposta deste professor
     * (ou coordenador que também leciona). Mesma regra do
     * buscarPorProfessor: disciplina + turma do aluno em
     * turma_disciplina_professor.
     */
    contarPendentesPorProfessor = async (registroProfessor) => {
        console.log("🟢 ContestacaoDAO.contarPendentesPorProfessor()");

        const SQL = `
            SELECT COUNT(*) AS total
            FROM contestacao c
            INNER JOIN aluno a ON a.matricula = c.matricula
            INNER JOIN turma_disciplina_professor tdp
                ON tdp.idDisciplina = c.idDisciplina
                AND tdp.idTurma = a.Turma_idTurma
            WHERE tdp.Professor_registro = ?
            AND c.status IN ('Em análise', 'Pendente');
        `;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [registroProfessor]);

        return Number(resultado[0]?.total) || 0;
    };

    /**
     * Cria o registro da contestação no banco, status inicial "Em análise".
     * Grava em notaOriginal a nota que o aluno está contestando (a nota
     * do bimestre naquele momento).
     */
    criar = async (matricula, idDisciplina, bimestre, motivo) => {
        console.log("🟢 ContestacaoDAO.criar()");

        const SQL = `
            INSERT INTO contestacao
                (matricula, idDisciplina, bimestre, motivo, status, notaOriginal)
            VALUES (
                ?, ?, ?, ?, 'Em análise',
                (
                    SELECT n.nota
                    FROM nota n
                    INNER JOIN alunodisciplinaprofessor adp
                        ON adp.idAlunoDisciplinaProfessor = n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor
                    WHERE adp.Aluno_matricula = ?
                    AND adp.Disciplina_idDisciplina = ?
                    AND n.bimestre = ?
                    LIMIT 1
                )
            );
        `;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [
            matricula, idDisciplina, bimestre, motivo,
            matricula, idDisciplina, bimestre
        ]);

        return resultado.insertId;
    };

    /**
     * Lista as contestações feitas por um aluno.
     *
     * O nome do professor vem via turma_disciplina_professor,
     * cruzando a disciplina da contestação com a turma do aluno.
     */
    buscarPorAluno = async (matricula) => {
        console.log("🟢 ContestacaoDAO.buscarPorAluno()");

        const SQL = `
            SELECT
                c.idContestacao,
                c.matricula,
                c.idDisciplina,
                d.nomeDisciplina,
                p.nome AS professorNome,
                c.bimestre,
                ${COLUNAS_NOTA},
                c.motivo,
                c.status,
                c.resposta,
                c.dataContestacao,
                c.dataResposta
            FROM contestacao c
            INNER JOIN disciplina d ON d.idDisciplina = c.idDisciplina
            INNER JOIN aluno a ON a.matricula = c.matricula
            LEFT JOIN turma_disciplina_professor tdp
                ON tdp.idDisciplina = d.idDisciplina
                AND tdp.idTurma = a.Turma_idTurma
            LEFT JOIN professor p ON p.registro = tdp.Professor_registro
            ${JOIN_NOTA}
            WHERE c.matricula = ?
            ORDER BY c.dataContestacao DESC;
        `;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [matricula]);

        return resultado || [];
    };

    /**
     * Lista as contestações recebidas pelas disciplinas/turmas de um
     * professor. Inclui o nome da turma do aluno (usado no modal do
     * professor).
     *
     * Filtra via turma_disciplina_professor: só aparecem contestações
     * de uma disciplina cuja turma (a do aluno que contestou) é
     * lecionada por esse professor especificamente.
     */
    buscarPorProfessor = async (registroProfessor) => {
        console.log("🟢 ContestacaoDAO.buscarPorProfessor()");

        const SQL = `
            SELECT
                c.idContestacao,
                c.matricula,
                a.nome AS alunoNome,
                t.nomeTurma AS nomeTurma,
                c.idDisciplina,
                d.nomeDisciplina,
                c.bimestre,
                ${COLUNAS_NOTA},
                c.motivo,
                c.status,
                c.resposta,
                c.dataContestacao,
                c.dataResposta
            FROM contestacao c
            INNER JOIN disciplina d ON d.idDisciplina = c.idDisciplina
            INNER JOIN aluno a ON a.matricula = c.matricula
            LEFT JOIN turma t ON t.idTurma = a.Turma_idTurma
            INNER JOIN turma_disciplina_professor tdp
                ON tdp.idDisciplina = d.idDisciplina
                AND tdp.idTurma = a.Turma_idTurma
            ${JOIN_NOTA}
            WHERE tdp.Professor_registro = ?
            ORDER BY c.dataContestacao DESC;
        `;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [registroProfessor]);

        return resultado || [];
    };

    /**
     * Busca uma contestação específica pelo ID, junto com o registro
     * do professor responsável (pra validar permissão de resposta).
     *
     * O professor responsável é o vinculado, via
     * turma_disciplina_professor, à disciplina da contestação E à
     * turma do aluno que contestou.
     */
    buscarPorId = async (idContestacao) => {
        console.log("🟢 ContestacaoDAO.buscarPorId()");

        const SQL = `
            SELECT
                c.*,
                ${COLUNAS_NOTA},
                tdp.Professor_registro AS registroProfessorResponsavel
            FROM contestacao c
            INNER JOIN disciplina d ON d.idDisciplina = c.idDisciplina
            INNER JOIN aluno a ON a.matricula = c.matricula
            LEFT JOIN turma_disciplina_professor tdp
                ON tdp.idDisciplina = d.idDisciplina
                AND tdp.idTurma = a.Turma_idTurma
            ${JOIN_NOTA}
            WHERE c.idContestacao = ?;
        `;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [idContestacao]);

        return resultado[0] || null;
    };

    /**
     * Professor responde a contestação: define status
     * (Alterado ou Recusada), resposta e data.
     */
    responder = async (idContestacao, status, resposta) => {
        console.log("🟢 ContestacaoDAO.responder()");

        const SQL = `
            UPDATE contestacao
            SET status = ?, resposta = ?, dataResposta = NOW()
            WHERE idContestacao = ?;
        `;

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, [status, resposta, idContestacao]);

        return resultado.affectedRows > 0;
    };
};