const Curso = require("../model/Curso");
const MysqlDatabase = require("../database/MysqlDatabase");

module.exports = class CursoDAO {
    #database;

    /**
     * Construtor do DAO, recebe a instância de MysqlDatabase.
     *
     * @param {MysqlDatabase} databaseInstance - Instância de MysqlDatabase injetada.
     */
    constructor(databaseInstance) {
        console.log("✅ CursoDAO.constructor()");
        this.#database = databaseInstance;
    }

    /**
     * Cria um novo curso no banco de dados.
     * @param {Curso} objCursoModel - Objeto Curso contendo os dados do curso.
     * @returns {Promise<number>} id do curso criado.
     * @throws {Error} Caso a inserção falhe.
     */
    create = async (objCursoModel) => {
        console.log("🟢 CursoDAO.create()");

        const SQL = "INSERT INTO Curso (nomeCurso) VALUES (?)";
        const params = [
            objCursoModel.nomeCurso
        ];

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        if (!resultado.insertId) {
            throw new Error("❌ Falha ao inserir curso");
        }
        return resultado.insertId;
    };

    /**
     * Remove um Curso do banco de dados pelo id.
     * Remove antes a linha automática de configuracaonotascurso (uma por curso),
     * numa transação. Se algum outro vínculo existir (aluno, turma, disciplina...),
     * o MySQL lança erro de FK (errno 1451), que o Service converte em mensagem amigável.
     *
     * @param {Curso} objCursoModel Model - Objeto Curso
     * @returns {Promise<boolean>} True se a exclusão foi bem-sucedida.
     */
    delete = async (objCursoModel) => {
        console.log("🟢 CursoDAO.delete()");

        const pool = await this.#database.getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            await connection.execute(
                "DELETE FROM configuracaonotascurso WHERE idCurso = ?;",
                [objCursoModel.idCurso]
            );

            const [resultado] = await connection.execute(
                "DELETE FROM Curso WHERE idCurso = ?;",
                [objCursoModel.idCurso]
            );

            await connection.commit();

            return resultado.affectedRows > 0;

        } catch (erro) {
            await connection.rollback();
            throw erro;
        } finally {
            connection.release();
        }
    };

    /**
     * Atualiza os dados de um curso existente.
     *
     * @param {Curso} objCursoModel - Objeto Curso contendo o id do curso e novos dados do curso.
     * @returns {Promise<boolean>} True se a atualização foi bem-sucedida.
     */
    update = async (objCursoModel) => {
        console.log("🟢 CursoDAO.update()");

        const SQL = "UPDATE Curso SET nomeCurso = ?  WHERE idCurso = ?";
        const params = [
            objCursoModel.nomeCurso,
            objCursoModel.idCurso
        ];

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        return resultado.affectedRows > 0;
    };

    /**
     * Retorna todos os cursos cadastrados no banco de dados.
     *
     * @returns {Promise<Array>} Lista de Curso.
     */
    findAll = async () => {
        console.log("🟢 CursoDAO.findAll()");

        const SQL = "SELECT * FROM Curso;";

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL);

        return resultado;
    };

    /**
     * Busca um Curso pelo id.
     *
     * @param {number} idCurso - id do Curso a ser buscado.
     * @returns {Promise<Object|null>} Objeto Curso encontrado ou null.
     */
    findById = async (idCurso) => {
        console.log("🟢 CursoDAO.findById()");

        const resultado = await this.findByField("idCurso", idCurso);
        return resultado[0] || null;
    };

    /**
     * Busca Curso por um campo específico.
     *
     * @param {string} field - Nome do campo para busca (permitidos: "idCurso","nomeCurso").
     * @param {*} value - Valor a ser buscado.
     * @returns {Promise<Array>} Lista de cursos encontrados.
     * @throws {Error} Caso o campo informado não seja permitido.
     */
    findByField = async (field, value) => {
        console.log(`🟢 CursoDAO.findByField() - Campo: ${field}, Valor: ${value}`);

        const allowedFields = ["idCurso", "nomeCurso"];
        if (!allowedFields.includes(field)) {
            throw new Error(`Campo inválido para busca: ${field}`);
        }

        const SQL = `SELECT * FROM Curso WHERE ${field} = ?;`;
        const params = [value];

        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);

        return resultado || [];
    };
};