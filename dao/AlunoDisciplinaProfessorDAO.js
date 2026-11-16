const AlunoDisciplinaProfessor = require("../model/AlunoDisciplinaProfessor");
const MysqlDatabase = require("../database/MysqlDatabase");

module.exports = class  AlunoDisciplinaProfessorDAO {
    #database;

    /**
     * Construtor do DAO, recebe a instância de MysqlDatabase.
     * 
     * @param {MysqlDatabase} databaseInstance - Instância de MysqlDatabase injetada.
     */
    constructor(databaseInstance) {
        console.log("✅ AlunoDisciplinaProfessor.constructor()");
        this.#database = databaseInstance;
    }


/**
     * Cria um nova nota no banco de dados.
     * @param {AlunoDisciplinaProfessor} objAlunoDisciplinaProfessorModel - Objeto aluno contendo os dados da AlunoDisciplinaProfessor
     * @returns {Promise<number>} id da AlunoDisciplinaProfessor criado.
     * @throws {Error} Caso a inserção falhe.
     */

create = async (objAlunoDisciplinaProfessorModel ) => {
    console.log("🟢 AlunoDisciplinaProfessorDAO.create()");

    const SQL = "INSERT INTO AlunoDisciplinaProfessor (Disciplina_idDisciplina,Aluno_matricula) VALUES (?,?)";
    const params = [
        objAlunoDisciplinaProfessorModel.disciplina.idDisciplina,
        objAlunoDisciplinaProfessorModel.aluno.matricula
    ];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    if (!resultado.insertId) {
        throw new Error("❌ Falha ao inserir AlunoDisciplinaProfessor");
    }

    return resultado.insertId;
};



/**
 * Remove uma AlunoDisciplinaProfessor do banco de dados pelo registro.
 * 

 * @param {AlunoDisciplinaProfessor} objAlunoDisciplinaProfessorModel Model - Objeto Aluno contendo o id do Curso e Turma a ser removido.
 * @returns {Promise<boolean>} True se a exclusão foi bem-sucedida.
 */
   
    delete = async (objAlunoDisciplinaProfessorModel) => {
    console.log("🟢 AlunoDisciplinaProfessorDAO.delete()");

    const SQL = "DELETE FROM AlunoDisciplinaProfessor WHERE idAlunoDisciplinaProfessor = ?";
    const params = [objAlunoDisciplinaProfessorModel.idAlunoDisciplinaProfessor];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return resultado.affectedRows > 0;
};


 /**
     * Atualiza os dados de um AlunoDisciplinaProfessor existente.
     * 
     * @param {AlunoDisciplinaProfessor} objAlunoDisciplinaProfessorModel - Objeto AlunoDisciplinaProfessor contendo o matricula do Aluno e novos dados do aluno.
     * @returns {Promise<boolean>} True se a atualização foi bem-sucedida.
     */
 update = async (objAlunoDisciplinaProfessorModel) => {
    console.log("🟢 AlunoDisciplinaProfessorDAO.update()");

    const SQL = "UPDATE AlunoDisciplinaProfessor SET Disciplina_idDisciplina = ?, Aluno_matricula = ? WHERE idAlunoDisciplinaProfessor =?";
    const params = [
        objAlunoDisciplinaProfessorModel.disciplina.idDisciplina,
        objAlunoDisciplinaProfessorModel.aluno.matricula,
        objAlunoDisciplinaProfessorModel.idAlunoDisciplinaProfessor
      
    ];
    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);
    return resultado.affectedRows > 0;

};
    /**
     * Retorna todos as AlunAlunoDisciplinaProfessor cadastradas no banco de dados.
     * 
     * @returns {Promise<Array>} Lista de AlunAlunoDisciplinaProfessor.
     */
    findAll = async () => {
        console.log("🟢 AlunoDisciplinaProfessorDAO.findAll()");
    
        const SQL = "SELECT * FROM AlunoDisciplinaProfessor;";
    
        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL);
    
        return resultado;
    };

    /**
     * Busca um AlunoDisciplinaProfessor pelo registro.
     * 
     * @param {number} idAlunoDisciplinaProfessor - matricula do AlunoDisciplinaProfessor  a ser buscado.
     * @returns {Promise<Cargo|null>} Objeto Aluno encontrado ou null.
     */
  findById = async (idAlunoDisciplinaProfessor) => {
    console.log("🟢 AlunoDisciplinaProfessorDAO.findById()");

    const resultado = await this.findByField("idAlunoDisciplinaProfessor", idAlunoDisciplinaProfessor);
    return resultado[0] || null;
};


     /**
     * Busca AlunoDisciplinaProfessor por um campo específico.
     * 
     * @param {string} field - Nome do campo para busca (permitidos: "matricula","nome","email","senha","telefone","idCurso","idTurma","ano").
     * @param {*} value - Valor a ser buscado.
     * @returns {Promise<Array>} Lista de disciplinas encontradas.
     * @throws {Error} Caso o campo informado não seja permitido.
     */
     findByField = async (field, value) => {
        console.log(`🟢 AlunoDisciplinaProfessorDAO.findByField() - Campo: ${field}, Valor: ${value}`);
    
        const allowedFields = ["idAlunoDisciplinaProfessor","Disciplina_idDisciplina","Aluno_matricula"];
        if (!allowedFields.includes(field)) {
            throw new Error(`Campo inválido para busca: ${field}`);
        }
    
        const SQL = `SELECT * FROM AlunoDisciplinaProfessor WHERE ${field} = ?;`;
        const params = [value];
    
        const pool = await this.#database.getPool();
        const [resultado] = await pool.execute(SQL, params);
    
        return resultado || [];
    };
    



























































 }
