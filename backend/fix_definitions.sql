-- Fix word definitions
UPDATE word SET definition = '{
  "word": "gee",
  "meanings": [
    {
      "pos": "interjection",
      "example": "Gee, I didn''t know that! (Vay canına, bunu bilmiyordum!)",
      "definition": "Şaşkınlık, coşku veya hayranlık ifade eden bir ünlem."
    }
  ],
  "difficulty": "A1",
  "verb_forms": null,
  "phrasal_verbs": []
}', is_enriched = true WHERE word = 'gee' AND language = 'en';

UPDATE word SET definition = '{
  "word": "Oberman",
  "meanings": [
    {
      "pos": "noun",
      "example": "Mr. Oberman is waiting in the lobby. (Bay Oberman lobide bekliyor.)",
      "definition": "Genellikle bir soyadı olarak kullanılan özel isim."
    }
  ],
  "difficulty": "C2",
  "verb_forms": null,
  "phrasal_verbs": []
}', is_enriched = true WHERE word = 'oberman' AND language = 'en';

UPDATE word SET definition = '{
  "word": "geeky",
  "meanings": [
    {
      "pos": "adjective",
      "example": "He had a geeky fascination with old computers. (Eski bilgisayarlara karşı inekçe bir hayranlığı vardı.)",
      "definition": "Genellikle teknoloji veya belirli bir konuya aşırı ilgili olan ve sosyal becerileri zayıf görünen (inek gibi)."
    }
  ],
  "difficulty": "B2",
  "verb_forms": null,
  "phrasal_verbs": []
}', is_enriched = true WHERE word = 'geeky' AND language = 'en';

UPDATE word SET definition = '{
  "word": "Julia",
  "meanings": [
    {
      "pos": "noun",
      "example": "Julia is a common name for girls. (Julia, kızlar için yaygın bir isimdir.)",
      "definition": "Yaygın bir kadın ismi veya bir programlama dili."
    }
  ],
  "difficulty": "C2",
  "verb_forms": null,
  "phrasal_verbs": []
}', is_enriched = true WHERE word = 'julia' AND language = 'en';

UPDATE word SET definition = '{
  "word": "sleeve",
  "meanings": [
    {
      "pos": "noun",
      "example": "I rolled up my sleeves and got to work. (Kollarımı sıvadım ve işe koyuldum.)",
      "definition": "Giysinin kolu veya bir şeyi korumak için kullanılan kılıf."
    }
  ],
  "difficulty": "A2",
  "verb_forms": null,
  "phrasal_verbs": []
}', is_enriched = true WHERE word = 'sleeve' AND language = 'en';

UPDATE word SET definition = '{
  "word": "dating",
  "meanings": [
    {
      "pos": "noun",
      "example": "Dating can be complicated in the modern world. (Modern dünyada flörtleşmek karmaşık olabilir.)",
      "definition": "Birisiyle romantik bir ilişki amacıyla görüşme süreci, flörtleşme."
    }
  ],
  "difficulty": "B1",
  "verb_forms": null,
  "phrasal_verbs": []
}', is_enriched = true WHERE word = 'dating' AND language = 'en';
