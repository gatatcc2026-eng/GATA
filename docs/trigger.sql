/* =========================================================
   TRIGGERS NOVOS - PROFESSOR x CURSO  (trigger_professor.sql)

   Rode DEPOIS do banco5.sql e do seu trigger.sql.
   Não mexe nos triggers que você já tem: os nomes aqui são
   diferentes (trg_pc_*, trg_tdp_vinculo_*, trg_prof_*,
   trg_solprof_*). Requer MariaDB 10.2.3+ / MySQL 5.7.2+
   (mais de um trigger no mesmo evento da mesma tabela).
========================================================= */

USE gata;

DROP TRIGGER IF EXISTS trg_tdp_vinculo_before_insert;
DROP TRIGGER IF EXISTS trg_tdp_vinculo_before_update;
DROP TRIGGER IF EXISTS trg_prof_after_insert_vinculo;
DROP TRIGGER IF EXISTS trg_prof_after_update_vinculo;
DROP TRIGGER IF EXISTS trg_pc_before_delete;
DROP TRIGGER IF EXISTS trg_solprof_before_insert;

DELIMITER $$

/* ---------------------------------------------------------
   Só leciona em curso em que está vinculado (professor_curso)
--------------------------------------------------------- */
CREATE TRIGGER trg_tdp_vinculo_before_insert
BEFORE INSERT ON turma_disciplina_professor
FOR EACH ROW
BEGIN
    DECLARE v_curso INT;

    SELECT Curso_idCurso INTO v_curso
      FROM disciplina
     WHERE idDisciplina = NEW.idDisciplina;

    IF NOT EXISTS (SELECT 1 FROM professor_curso
                    WHERE registro = NEW.Professor_registro
                      AND idCurso = v_curso) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Professor não está vinculado ao curso desta disciplina.';
    END IF;
END$$

CREATE TRIGGER trg_tdp_vinculo_before_update
BEFORE UPDATE ON turma_disciplina_professor
FOR EACH ROW
BEGIN
    DECLARE v_curso INT;

    SELECT Curso_idCurso INTO v_curso
      FROM disciplina
     WHERE idDisciplina = NEW.idDisciplina;

    IF NOT EXISTS (SELECT 1 FROM professor_curso
                    WHERE registro = NEW.Professor_registro
                      AND idCurso = v_curso) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Professor não está vinculado ao curso desta disciplina.';
    END IF;
END$$

/* ---------------------------------------------------------
   Coordenador sempre vinculado ao curso que coordena
--------------------------------------------------------- */
CREATE TRIGGER trg_prof_after_insert_vinculo
AFTER INSERT ON professor
FOR EACH ROW
BEGIN
    IF NEW.CursoCoordenado_idCurso IS NOT NULL THEN
        INSERT IGNORE INTO professor_curso (registro, idCurso)
        VALUES (NEW.registro, NEW.CursoCoordenado_idCurso);
    END IF;
END$$

CREATE TRIGGER trg_prof_after_update_vinculo
AFTER UPDATE ON professor
FOR EACH ROW
BEGIN
    IF NEW.CursoCoordenado_idCurso IS NOT NULL THEN
        INSERT IGNORE INTO professor_curso (registro, idCurso)
        VALUES (NEW.registro, NEW.CursoCoordenado_idCurso);
    END IF;
END$$

/* ---------------------------------------------------------
   Não remove vínculo se ele ainda leciona no curso ou se
   é o curso que ele coordena
--------------------------------------------------------- */
CREATE TRIGGER trg_pc_before_delete
BEFORE DELETE ON professor_curso
FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM professor
                WHERE registro = OLD.registro
                  AND CursoCoordenado_idCurso = OLD.idCurso) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Não é possível remover o vínculo com o curso que o professor coordena.';
    END IF;

    IF EXISTS (SELECT 1
                 FROM turma_disciplina_professor t
                 JOIN disciplina d ON d.idDisciplina = t.idDisciplina
                WHERE t.Professor_registro = OLD.registro
                  AND d.Curso_idCurso = OLD.idCurso) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Professor ainda leciona disciplinas neste curso.';
    END IF;
END$$

/* ---------------------------------------------------------
   Solicitação de professor existente:
   - professor precisa estar no curso de origem
   - não pode já estar no curso de destino
   - sem solicitação pendente repetida
--------------------------------------------------------- */
CREATE TRIGGER trg_solprof_before_insert
BEFORE INSERT ON solicitacaoprofessor
FOR EACH ROW
BEGIN
    IF NOT EXISTS (SELECT 1 FROM professor_curso
                    WHERE registro = NEW.registroProfessor
                      AND idCurso = NEW.idCursoOrigem) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Professor não pertence ao curso de origem informado.';
    END IF;

    IF EXISTS (SELECT 1 FROM professor_curso
                WHERE registro = NEW.registroProfessor
                  AND idCurso = NEW.idCursoDestino) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Professor já está vinculado ao curso de destino.';
    END IF;

    IF NEW.status = 'Pendente' AND EXISTS (SELECT 1 FROM solicitacaoprofessor
                                            WHERE registroProfessor = NEW.registroProfessor
                                              AND idCursoDestino = NEW.idCursoDestino
                                              AND status = 'Pendente') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Já existe uma solicitação pendente para este professor neste curso.';
    END IF;
END$$

DELIMITER ;