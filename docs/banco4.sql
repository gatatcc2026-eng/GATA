DROP DATABASE IF EXISTS gata;

CREATE DATABASE gata
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE gata;


/* =========================================================
   CURSO
========================================================= */

CREATE TABLE curso (

    idCurso INT NOT NULL AUTO_INCREMENT,
    nomeCurso VARCHAR(45) NOT NULL,

    PRIMARY KEY (idCurso)

) ENGINE = InnoDB;


/* =========================================================
   PROFESSOR
========================================================= */

CREATE TABLE professor (

    registro INT NOT NULL,
    nome VARCHAR(45),
    senha VARCHAR(100),
    telefone1 VARCHAR(45),
    email1 VARCHAR(45),
    coordenador TINYINT(1) DEFAULT 0,

    CursoCoordenado_idCurso INT NULL,

    PRIMARY KEY (registro),

    INDEX fk_Professor_CursoCoordenado_idx
        (CursoCoordenado_idCurso),

    CONSTRAINT fk_Professor_CursoCoordenado
        FOREIGN KEY (CursoCoordenado_idCurso)
        REFERENCES curso (idCurso)
        ON DELETE SET NULL
        ON UPDATE NO ACTION

) ENGINE = InnoDB;


/* =========================================================
   PROFESSOR x CURSO

   "Este professor pode atuar neste curso." Um professor, vários
   cursos. Independe de coordenar: o curso coordenado também
   entra aqui (trigger), mas o professor pode ter outros.

   Excluir curso ou professor remove o vínculo (CASCADE).
   Remover um vínculo em que o professor ainda leciona, ou que é
   o curso que ele coordena, é bloqueado pelo trigger.
========================================================= */

CREATE TABLE professor_curso (

    registro INT NOT NULL,
    idCurso INT NOT NULL,

    PRIMARY KEY (registro, idCurso),

    INDEX fk_PC_Curso_idx (idCurso),

    CONSTRAINT fk_PC_Professor
        FOREIGN KEY (registro)
        REFERENCES professor (registro)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_PC_Curso
        FOREIGN KEY (idCurso)
        REFERENCES curso (idCurso)
        ON DELETE CASCADE
        ON UPDATE NO ACTION

) ENGINE = InnoDB;


/* =========================================================
   TURMA
========================================================= */

CREATE TABLE turma (

    idTurma INT NOT NULL AUTO_INCREMENT,
    nomeTurma VARCHAR(45) NOT NULL,
    Curso_idCurso INT NOT NULL,

    PRIMARY KEY (idTurma),

    INDEX fk_Turma_Curso_idx (Curso_idCurso),

    CONSTRAINT fk_Turma_Curso
        FOREIGN KEY (Curso_idCurso)
        REFERENCES curso (idCurso)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION

) ENGINE = InnoDB;


/* =========================================================
   DISCIPLINA
========================================================= */

CREATE TABLE disciplina (

    idDisciplina INT NOT NULL AUTO_INCREMENT,
    nomeDisciplina VARCHAR(45) NOT NULL,

    Curso_idCurso INT NOT NULL,

    PRIMARY KEY (idDisciplina),

    INDEX fk_Disciplina_Curso_idx
        (Curso_idCurso),

    CONSTRAINT fk_Disciplina_Curso
        FOREIGN KEY (Curso_idCurso)
        REFERENCES curso (idCurso)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION

) ENGINE = InnoDB;


/* =========================================================
   TURMA x DISCIPLINA x PROFESSOR

   Diz quem dá qual disciplina em qual turma. O mesmo professor
   pode ter várias linhas, inclusive em cursos diferentes.

   Excluir turma ou disciplina apaga o vínculo (CASCADE).
   Excluir PROFESSOR com vínculo é BLOQUEADO (RESTRICT), para
   não apagar em silêncio as disciplinas dele em outros cursos.

   Turma e disciplina do mesmo vínculo precisam ser do mesmo
   curso, e o professor precisa estar em professor_curso para o
   curso da disciplina: ambos garantidos pelos triggers.
========================================================= */

CREATE TABLE turma_disciplina_professor (

    idTurma INT NOT NULL,
    idDisciplina INT NOT NULL,
    Professor_registro INT NOT NULL,

    PRIMARY KEY (idTurma, idDisciplina, Professor_registro),

    INDEX fk_TDP_Turma_idx (idTurma),
    INDEX fk_TDP_Disciplina_idx (idDisciplina),
    INDEX fk_TDP_Professor_idx (Professor_registro),

    CONSTRAINT fk_TDP_Turma
        FOREIGN KEY (idTurma)
        REFERENCES turma (idTurma)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT fk_TDP_Disciplina
        FOREIGN KEY (idDisciplina)
        REFERENCES disciplina (idDisciplina)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT fk_TDP_Professor
        FOREIGN KEY (Professor_registro)
        REFERENCES professor (registro)
        ON DELETE RESTRICT
        ON UPDATE NO ACTION

) ENGINE = InnoDB;


/* =========================================================
   ALUNO
========================================================= */

CREATE TABLE aluno (

    matricula INT NOT NULL,
    nome VARCHAR(45) NOT NULL,
    email VARCHAR(45),
    senha VARCHAR(100),
    telefone VARCHAR(45),

    Curso_idCurso INT NOT NULL,
    Turma_idTurma INT NOT NULL,

    ano YEAR,

    PRIMARY KEY (matricula),

    INDEX fk_Aluno_Curso_idx (Curso_idCurso),
    INDEX fk_Aluno_Turma_idx (Turma_idTurma),

    CONSTRAINT fk_Aluno_Curso
        FOREIGN KEY (Curso_idCurso)
        REFERENCES curso (idCurso)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,

    CONSTRAINT fk_Aluno_Turma
        FOREIGN KEY (Turma_idTurma)
        REFERENCES turma (idTurma)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION

) ENGINE = InnoDB;


/* =========================================================
   ALUNO DISCIPLINA PROFESSOR
   (UNIQUE impede o mesmo aluno duplicado na disciplina)
========================================================= */

CREATE TABLE alunodisciplinaprofessor (

    idAlunoDisciplinaProfessor INT NOT NULL AUTO_INCREMENT,

    Disciplina_idDisciplina INT NOT NULL,
    Aluno_matricula INT NOT NULL,

    PRIMARY KEY (idAlunoDisciplinaProfessor),

    UNIQUE KEY uk_adp_aluno_disciplina
        (Aluno_matricula, Disciplina_idDisciplina),

    INDEX fk_ADP_Disciplina_idx (Disciplina_idDisciplina),
    INDEX fk_ADP_Aluno_idx (Aluno_matricula),

    CONSTRAINT fk_ADP_Disciplina
        FOREIGN KEY (Disciplina_idDisciplina)
        REFERENCES disciplina (idDisciplina)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,

    CONSTRAINT fk_ADP_Aluno
        FOREIGN KEY (Aluno_matricula)
        REFERENCES aluno (matricula)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION

) ENGINE = InnoDB;


/* =========================================================
   NOTA
========================================================= */

CREATE TABLE nota (

    idNota INT NOT NULL AUTO_INCREMENT,

    nota FLOAT,
    bimestre VARCHAR(45),

    AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor INT NOT NULL,

    PRIMARY KEY (idNota),

    INDEX fk_Nota_ADP_idx
        (AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor),

    UNIQUE KEY uk_nota_adp_bimestre
    (
        AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor,
        bimestre
    ),

    CONSTRAINT fk_Nota_ADP
        FOREIGN KEY (AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor)
        REFERENCES alunodisciplinaprofessor (idAlunoDisciplinaProfessor)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION

) ENGINE = InnoDB;


/* =========================================================
   HISTORICO DE NOTAS
   Preenchido pelo trigger trg_nota_before_update (trigger.sql):
   guarda a nota anterior quando ela é alterada com as notas
   fechadas. Excluir a nota apaga o histórico dela (CASCADE),
   para não travar a exclusão feita pelo NotaDAO.
========================================================= */

CREATE TABLE historico (

    idhistorico INT NOT NULL AUTO_INCREMENT,
    nota_idNota INT NOT NULL,
    data DATETIME NULL,
    notaAnterior FLOAT NULL,
    motivo VARCHAR(100) NULL,

    PRIMARY KEY (idhistorico),

    INDEX fk_historico_nota_idx (nota_idNota),

    CONSTRAINT fk_historico_nota
        FOREIGN KEY (nota_idNota)
        REFERENCES nota (idNota)
        ON DELETE CASCADE
        ON UPDATE NO ACTION

) ENGINE = InnoDB;


/* =========================================================
   CONTESTAÇÃO / REQUISIÇÕES
========================================================= */

CREATE TABLE contestacao (

    idContestacao INT NOT NULL AUTO_INCREMENT,

    matricula INT NOT NULL,
    idDisciplina INT NOT NULL,
    bimestre VARCHAR(45) NOT NULL,
    motivo VARCHAR(1000) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pendente',
    resposta VARCHAR(1000) NULL,
    dataContestacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dataResposta DATETIME NULL,

    PRIMARY KEY (idContestacao),

    INDEX fk_Contestacao_Aluno_idx (matricula),
    INDEX fk_Contestacao_Disciplina_idx (idDisciplina),
    INDEX idx_Contestacao_Status (status),

    CONSTRAINT fk_Contestacao_Aluno
        FOREIGN KEY (matricula)
        REFERENCES aluno (matricula)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,

    CONSTRAINT fk_Contestacao_Disciplina
        FOREIGN KEY (idDisciplina)
        REFERENCES disciplina (idDisciplina)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION

) ENGINE = InnoDB;


/* =========================================================
   SOLICITAÇÃO DE TRANSFERÊNCIA DE CURSO (ALUNO)
   Colunas conforme o SolicitacaoTransferenciaDAO:
   solicitadoPor e respondidoPor.
========================================================= */

CREATE TABLE solicitacaotransferencia (

    idSolicitacao INT NOT NULL AUTO_INCREMENT,

    matricula INT NOT NULL,
    idCursoOrigem INT NOT NULL,
    idCursoDestino INT NOT NULL,
    idTurmaDestino INT NOT NULL,

    solicitadoPor INT NULL,
    respondidoPor INT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'Pendente',

    dataSolicitacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dataResposta DATETIME NULL,

    PRIMARY KEY (idSolicitacao),

    INDEX idx_Solicitacao_Aluno (matricula),
    INDEX idx_Solicitacao_CursoOrigem (idCursoOrigem),
    INDEX idx_Solicitacao_CursoDestino (idCursoDestino),
    INDEX idx_Solicitacao_Status (status),

    CONSTRAINT fk_Solicitacao_Aluno
        FOREIGN KEY (matricula)
        REFERENCES aluno (matricula)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT fk_Solicitacao_CursoOrigem
        FOREIGN KEY (idCursoOrigem)
        REFERENCES curso (idCurso)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,

    CONSTRAINT fk_Solicitacao_CursoDestino
        FOREIGN KEY (idCursoDestino)
        REFERENCES curso (idCurso)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,

    CONSTRAINT fk_Solicitacao_TurmaDestino
        FOREIGN KEY (idTurmaDestino)
        REFERENCES turma (idTurma)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,

    CONSTRAINT fk_Solicitacao_SolicitadoPor
        FOREIGN KEY (solicitadoPor)
        REFERENCES professor (registro)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_Solicitacao_RespondidoPor
        FOREIGN KEY (respondidoPor)
        REFERENCES professor (registro)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE = InnoDB;


CREATE TABLE solicitacaoprofessor (

    idSolicitacao INT NOT NULL AUTO_INCREMENT,

    registroProfessor INT NOT NULL,
    idCursoOrigem INT NOT NULL,
    idCursoDestino INT NOT NULL,

    solicitadoPor INT NULL,
    respondidoPor INT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'Em análise',

    dataSolicitacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dataResposta DATETIME NULL,

    PRIMARY KEY (idSolicitacao),

    INDEX idx_SolProf_Professor (registroProfessor),
    INDEX idx_SolProf_CursoOrigem (idCursoOrigem),
    INDEX idx_SolProf_CursoDestino (idCursoDestino),
    INDEX idx_SolProf_Status (status),

    CONSTRAINT chk_SolProf_cursos_diferentes
        CHECK (idCursoOrigem <> idCursoDestino),

    CONSTRAINT fk_SolProf_Professor
        FOREIGN KEY (registroProfessor)
        REFERENCES professor (registro)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_SolProf_CursoOrigem
        FOREIGN KEY (idCursoOrigem)
        REFERENCES curso (idCurso)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT fk_SolProf_CursoDestino
        FOREIGN KEY (idCursoDestino)
        REFERENCES curso (idCurso)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT fk_SolProf_SolicitadoPor
        FOREIGN KEY (solicitadoPor)
        REFERENCES professor (registro)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_SolProf_RespondidoPor
        FOREIGN KEY (respondidoPor)
        REFERENCES professor (registro)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE = InnoDB;


/* =========================================================
   HISTÓRICO DO COORDENADOR
========================================================= */

CREATE TABLE historicocoordenador (

    idHistorico INT NOT NULL AUTO_INCREMENT,
    registro INT NOT NULL,
    acao VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    dataHora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (idHistorico),

    CONSTRAINT fk_historico_coordenador_professor
        FOREIGN KEY (registro)
        REFERENCES professor (registro)
        ON DELETE CASCADE
        ON UPDATE CASCADE

) ENGINE = InnoDB;


/* =========================================================
   CONFIGURAÇÃO DE NOTAS (FECHAR / LIBERAR) - GERAL (LEGADO)
   Fechamento geral, linha id = 1. Mantida por compatibilidade
   (triggers/código antigo); a trava atual é por curso, na
   tabela configuracaonotascurso abaixo.
========================================================= */

CREATE TABLE configuracaonotas (

    id INT NOT NULL,
    notasFechadas TINYINT(1) NOT NULL DEFAULT 0,
    fechadoPor INT NULL,
    atualizadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_configuracaonotas_professor
        FOREIGN KEY (fechadoPor)
        REFERENCES professor (registro)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE = InnoDB;


CREATE TABLE configuracaonotascurso (

    idCurso INT NOT NULL,
    notasFechadas TINYINT(1) NOT NULL DEFAULT 0,
    fechadoPor INT NULL,
    atualizadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (idCurso),

    CONSTRAINT fk_ConfigNotasCurso_Curso
        FOREIGN KEY (idCurso)
        REFERENCES curso (idCurso)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,

    CONSTRAINT fk_ConfigNotasCurso_Professor
        FOREIGN KEY (fechadoPor)
        REFERENCES professor (registro)
        ON DELETE SET NULL
        ON UPDATE CASCADE

) ENGINE = InnoDB;

/* =========================================================
   PROFESSOR x CURSOS COORDENADOS

   Permite que um mesmo coordenador administre
   mais de um curso.
========================================================= */

CREATE TABLE coordenador_curso (

    Professor_registro INT NOT NULL,
    Curso_idCurso INT NOT NULL,

    PRIMARY KEY (
        Professor_registro,
        Curso_idCurso
    ),

    INDEX idx_CoordenadorCurso_Curso
        (Curso_idCurso),

    CONSTRAINT fk_CoordenadorCurso_Professor
        FOREIGN KEY (Professor_registro)
        REFERENCES professor (registro)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_CoordenadorCurso_Curso
        FOREIGN KEY (Curso_idCurso)
        REFERENCES curso (idCurso)
        ON DELETE CASCADE
        ON UPDATE CASCADE

) ENGINE = InnoDB;

/* =========================================================
   DADOS INICIAIS
========================================================= */

INSERT INTO curso (idCurso, nomeCurso) VALUES (1, 'Informática'), (2, 'Eletrônica');

INSERT INTO professor (registro, nome, senha, telefone1, email1, coordenador, CursoCoordenado_idCurso) VALUES (1234, 'helio', '$2b$10$EciNdPmX/J9rpKFvByIvIuNGYeJlyJgbxTLW522.Jlm5MWejxZcyW', '12', 'binottojoaovitor04@gmail.com', 0, NULL), (2001, 'Marcos Silva', '$2b$10$EciNdPmX/J9rpKFvByIvIuNGYeJlyJgbxTLW522.Jlm5MWejxZcyW', '11911111111', 'marcos@gmail.com', 0, NULL), (2002, 'Fernanda Souza', '$2b$10$EciNdPmX/J9rpKFvByIvIuNGYeJlyJgbxTLW522.Jlm5MWejxZcyW', '11922222222', 'fernanda@gmail.com', 0, NULL), (9999, 'Carlos Coordenador', '$2b$10$EciNdPmX/J9rpKFvByIvIuNGYeJlyJgbxTLW522.Jlm5MWejxZcyW', '11988888888', 'coordenador@gmail.com', 1, 1), (5001, 'Roberto Lima', '$2b$10$EciNdPmX/J9rpKFvByIvIuNGYeJlyJgbxTLW522.Jlm5MWejxZcyW', '11977777777', 'roberto.lima@gmail.com', 1, 2);

-- Cursos em que cada professor pode atuar. Coordenadores entram no curso que coordenam; o 2001 atua em Informática e em Eletrônica
INSERT INTO professor_curso (registro, idCurso) VALUES (1234, 1), (2001, 1), (2001, 2), (2002, 1), (9999, 1), (5001, 2);

INSERT INTO turma (idTurma, nomeTurma, Curso_idCurso) VALUES (1, '3DS', 1), (2, '3EL', 2);

INSERT INTO disciplina (idDisciplina, nomeDisciplina, Curso_idCurso) VALUES (1, 'Programação Web', 1), (2, 'Banco de Dados', 1), (3, 'Redes de Computadores', 1), (4, 'Circuitos Elétricos', 2);

-- O professor 2001 dá aula em Informática (Banco de Dados) e em Eletrônica (Circuitos Elétricos)
INSERT INTO turma_disciplina_professor (idTurma, idDisciplina, Professor_registro) VALUES (1, 1, 1234), (1, 2, 2001), (1, 3, 2002), (2, 4, 2001);

INSERT INTO aluno (matricula, nome, email, senha, telefone, Curso_idCurso, Turma_idTurma, ano) VALUES (20250001,'João Silva','joao@gmail.com','$2b$10$.qsItZBaZb.DgXVtI7XgD.UNTdHDWq0IRgusAd76s8Qszlpij2oxC','11999999999',1,1,2026),(20250002,'Maria Oliveira','maria@gmail.com','$2b$10$.qsItZBaZb.DgXVtI7XgD.UNTdHDWq0IRgusAd76s8Qszlpij2oxC','11988888881',1,1,2026),(20250003,'Pedro Santos','pedro@gmail.com','$2b$10$.qsItZBaZb.DgXVtI7XgD.UNTdHDWq0IRgusAd76s8Qszlpij2oxC','11988888882',1,1,2026),(20250004,'Ana Souza','ana@gmail.com','$2b$10$.qsItZBaZb.DgXVtI7XgD.UNTdHDWq0IRgusAd76s8Qszlpij2oxC','11988888883',1,1,2026),(20250005,'Lucas Pereira','lucas@gmail.com','$2b$10$.qsItZBaZb.DgXVtI7XgD.UNTdHDWq0IRgusAd76s8Qszlpij2oxC','11988888884',1,1,2026),(20250006,'Julia Costa','julia@gmail.com','$2b$10$.qsItZBaZb.DgXVtI7XgD.UNTdHDWq0IRgusAd76s8Qszlpij2oxC','11988888885',1,1,2026),(20250007,'Rafael Mendes','rafael@gmail.com','$2b$10$.qsItZBaZb.DgXVtI7XgD.UNTdHDWq0IRgusAd76s8Qszlpij2oxC','11988888886',2,2,2026);

INSERT INTO alunodisciplinaprofessor (Disciplina_idDisciplina, Aluno_matricula) VALUES (1,20250001),(2,20250001),(3,20250001),(1,20250002),(2,20250002),(3,20250002),(1,20250003),(2,20250003),(3,20250003),(1,20250004),(2,20250004),(3,20250004),(1,20250005),(2,20250005),(3,20250005),(1,20250006),(2,20250006),(3,20250006),(4,20250007);

INSERT INTO nota (nota, bimestre, AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor) VALUES (8.0,'1º Bimestre',1),(8.5,'2º Bimestre',1),(9.0,'3º Bimestre',1),(8.7,'4º Bimestre',1),(7.5,'1º Bimestre',2),(8.0,'2º Bimestre',2),(8.5,'3º Bimestre',2),(9.0,'4º Bimestre',2),(9.0,'1º Bimestre',3),(8.5,'2º Bimestre',3),(9.5,'3º Bimestre',3),(9.0,'4º Bimestre',3),(7.0,'1º Bimestre',4),(7.5,'2º Bimestre',4),(8.0,'3º Bimestre',4),(8.5,'4º Bimestre',4),(8.0,'1º Bimestre',5),(8.5,'2º Bimestre',5),(9.0,'3º Bimestre',5),(8.5,'4º Bimestre',5),(9.0,'1º Bimestre',6),(9.0,'2º Bimestre',6),(8.5,'3º Bimestre',6),(9.5,'4º Bimestre',6),(6.5,'1º Bimestre',7),(7.0,'2º Bimestre',7),(7.5,'3º Bimestre',7),(8.0,'4º Bimestre',7),(7.0,'1º Bimestre',8),(7.5,'2º Bimestre',8),(8.0,'3º Bimestre',8),(8.5,'4º Bimestre',8),(8.0,'1º Bimestre',9),(8.0,'2º Bimestre',9),(8.5,'3º Bimestre',9),(9.0,'4º Bimestre',9),(9.0,'1º Bimestre',10),(9.5,'2º Bimestre',10),(9.0,'3º Bimestre',10),(9.5,'4º Bimestre',10),(8.5,'1º Bimestre',11),(9.0,'2º Bimestre',11),(9.5,'3º Bimestre',11),(9.0,'4º Bimestre',11),(7.5,'1º Bimestre',12),(8.0,'2º Bimestre',12),(8.5,'3º Bimestre',12),(9.0,'4º Bimestre',12),(6.0,'1º Bimestre',13),(6.5,'2º Bimestre',13),(7.0,'3º Bimestre',13),(7.5,'4º Bimestre',13),(7.5,'1º Bimestre',14),(7.0,'2º Bimestre',14),(8.0,'3º Bimestre',14),(8.5,'4º Bimestre',14),(8.0,'1º Bimestre',15),(8.5,'2º Bimestre',15),(8.0,'3º Bimestre',15),(9.0,'4º Bimestre',15),(10.0,'1º Bimestre',16),(9.5,'2º Bimestre',16),(9.5,'3º Bimestre',16),(10.0,'4º Bimestre',16),(9.0,'1º Bimestre',17),(9.5,'2º Bimestre',17),(10.0,'3º Bimestre',17),(9.5,'4º Bimestre',17),(8.5,'1º Bimestre',18),(9.0,'2º Bimestre',18),(9.5,'3º Bimestre',18),(9.0,'4º Bimestre',18);

INSERT INTO configuracaonotas (id, notasFechadas, fechadoPor) VALUES (1, 0, NULL);

-- Uma linha por curso, todas abertas
INSERT INTO configuracaonotascurso (idCurso, notasFechadas, fechadoPor) VALUES (1, 0, NULL), (2, 0, NULL);
-- 	drop database gata;