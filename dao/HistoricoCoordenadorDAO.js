module.exports = class HistoricoCoordenadorDAO {

    #database;

    constructor(databaseInstance) {

        console.log("✅ HistoricoCoordenadorDAO.constructor()");

        this.#database = databaseInstance;
    }


    /* =========================================================
       REGISTRAR HISTÓRICO

       idCurso é opcional: quem chamava só com 3 argumentos
       continua funcionando (o curso fica NULL).
    ========================================================= */

    registrar = async (registroProfessor, acao, descricao, idCurso = null) => {

        try {

            console.log("🟢 HistoricoCoordenadorDAO.registrar()");

            const SQL = `
                INSERT INTO historicocoordenador
                (registro, acao, descricao, Curso_idCurso)
                VALUES (?, ?, ?, ?)
            `;

            const pool = await this.#database.getPool();

            const [resultado] = await pool.execute(
                SQL,
                [registroProfessor, acao, descricao, idCurso ?? null]
            );

            return resultado.insertId;

        } catch (error) {

            console.error("❌ ERRO SQL EM HistoricoCoordenadorDAO.registrar():", error);
            console.error("Mensagem SQL:", error.message);
            console.error("Código MySQL:", error.code);
            console.error("SQL State:", error.sqlState);

            throw error;
        }
    };


    /* =========================================================
       CURSOS QUE O COORDENADOR ADMINISTRA

       Junta o curso principal (professor.CursoCoordenado_idCurso)
       com os da tabela coordenador_curso. Só conta quem está
       marcado como coordenador (coordenador = 1).
    ========================================================= */

    cursosDoCoordenador = async (registroProfessor) => {

        try {

            console.log("🟢 HistoricoCoordenadorDAO.cursosDoCoordenador()");

            const SQL = `
                SELECT p.CursoCoordenado_idCurso AS idCurso
                FROM professor p
                WHERE p.registro = ?
                  AND p.coordenador = 1
                  AND p.CursoCoordenado_idCurso IS NOT NULL

                UNION

                SELECT cc.Curso_idCurso AS idCurso
                FROM coordenador_curso cc
                INNER JOIN professor p
                    ON p.registro = cc.Professor_registro
                WHERE cc.Professor_registro = ?
                  AND p.coordenador = 1
            `;

            const pool = await this.#database.getPool();

            const [resultado] = await pool.execute(
                SQL,
                [registroProfessor, registroProfessor]
            );

            return resultado.map(linha => Number(linha.idCurso));

        } catch (error) {

            console.error("❌ ERRO SQL EM HistoricoCoordenadorDAO.cursosDoCoordenador():", error);
            console.error("Mensagem SQL:", error.message);
            console.error("Código MySQL:", error.code);
            console.error("SQL State:", error.sqlState);

            throw error;
        }
    };


    /* =========================================================
       CONTEXTO DE UMA NOTA (aluno, turma, disciplina e curso)

       Usado para montar a mensagem quando o professor altera
       uma nota. O curso vem da DISCIPLINA.
    ========================================================= */

    buscarContextoNota = async (idNota) => {

        try {

            console.log("🟢 HistoricoCoordenadorDAO.buscarContextoNota()");

            const SQL = `
                SELECT
                    a.nome AS nomeAluno,
                    t.nomeTurma,
                    d.nomeDisciplina,
                    d.Curso_idCurso AS idCurso
                FROM nota n
                INNER JOIN alunodisciplinaprofessor adp
                    ON adp.idAlunoDisciplinaProfessor =
                       n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor
                INNER JOIN aluno a
                    ON a.matricula = adp.Aluno_matricula
                INNER JOIN disciplina d
                    ON d.idDisciplina = adp.Disciplina_idDisciplina
                INNER JOIN turma t
                    ON t.idTurma = a.Turma_idTurma
                WHERE n.idNota = ?
            `;

            const pool = await this.#database.getPool();

            const [resultado] = await pool.execute(SQL, [idNota]);

            return resultado[0] || null;

        } catch (error) {

            console.error("❌ ERRO SQL EM HistoricoCoordenadorDAO.buscarContextoNota():", error);
            console.error("Mensagem SQL:", error.message);
            console.error("Código MySQL:", error.code);
            console.error("SQL State:", error.sqlState);

            throw error;
        }
    };


    /* =========================================================
       BUSCAR HISTÓRICO DOS CURSOS INFORMADOS

       Sem cursos, devolve lista vazia. Registros com
       Curso_idCurso NULL não aparecem para ninguém.
    ========================================================= */

    findAll = async (idsCursos = []) => {

        try {

            console.log("🟢 HistoricoCoordenadorDAO.findAll()");

            if (!Array.isArray(idsCursos) || idsCursos.length === 0) {
                return [];
            }

            const placeholders = idsCursos.map(() => "?").join(", ");

            const SQL = `
                SELECT
                    hc.idHistorico,
                    hc.registro,
                    hc.acao,
                    hc.descricao,
                    hc.dataHora,
                    hc.Curso_idCurso,
                    c.nomeCurso,
                    COALESCE(p.nome, 'Professor não encontrado') AS nomeProfessor
                FROM historicocoordenador hc
                LEFT JOIN professor p
                    ON p.registro = hc.registro
                LEFT JOIN curso c
                    ON c.idCurso = hc.Curso_idCurso
                WHERE hc.Curso_idCurso IN (${placeholders})
                ORDER BY
                    hc.dataHora DESC,
                    hc.idHistorico DESC
            `;

            const pool = await this.#database.getPool();

            const [resultado] = await pool.execute(SQL, idsCursos);

            console.log("✅ Histórico encontrado:", resultado.length);

            return resultado;

        } catch (error) {

            console.error("❌ ERRO SQL EM HistoricoCoordenadorDAO.findAll():", error);
            console.error("Mensagem SQL:", error.message);
            console.error("Código MySQL:", error.code);
            console.error("SQL State:", error.sqlState);

            throw error;
        }
    };

};