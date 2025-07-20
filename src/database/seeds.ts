import { db } from "./database";

// Datos de lenguajes de programación
const languages = [
	// Top 20 lenguajes principales (featured)
	{
		name: "JavaScript",
		description: "Lenguaje de programación versátil para web",
		color: "#f7df1e",
		is_featured: true,
	},
	{
		name: "Python",
		description: "Lenguaje simple y poderoso para IA y desarrollo web",
		color: "#3776ab",
		is_featured: true,
	},
	{
		name: "TypeScript",
		description: "JavaScript con tipos estáticos",
		color: "#3178c6",
		is_featured: true,
	},
	{
		name: "Java",
		description: "Lenguaje robusto para aplicaciones empresariales",
		color: "#ed8b00",
		is_featured: true,
	},
	{
		name: "C++",
		description: "Lenguaje de alto rendimiento",
		color: "#00599c",
		is_featured: true,
	},
	{
		name: "C#",
		description: "Lenguaje de Microsoft para .NET",
		color: "#512bd4",
		is_featured: true,
	},
	{
		name: "Go",
		description: "Lenguaje de Google para sistemas distribuidos",
		color: "#00add8",
		is_featured: true,
	},
	{
		name: "Rust",
		description: "Lenguaje seguro para programación de sistemas",
		color: "#ce422b",
		is_featured: true,
	},
	{
		name: "PHP",
		description: "Lenguaje popular para desarrollo web",
		color: "#777bb4",
		is_featured: true,
	},
	{
		name: "Swift",
		description: "Lenguaje de Apple para iOS y macOS",
		color: "#fa7343",
		is_featured: true,
	},
	{
		name: "Kotlin",
		description: "Lenguaje moderno compatible con Java",
		color: "#7f52ff",
		is_featured: true,
	},
	{
		name: "Ruby",
		description: "Lenguaje elegante y expresivo",
		color: "#cc342d",
		is_featured: true,
	},
	{
		name: "C",
		description: "Lenguaje fundamental de programación",
		color: "#a8b9cc",
		is_featured: true,
	},
	{
		name: "Dart",
		description: "Lenguaje de Google para Flutter",
		color: "#0175c2",
		is_featured: true,
	},
	{
		name: "Scala",
		description: "Lenguaje funcional para la JVM",
		color: "#dc322f",
		is_featured: true,
	},
	{
		name: "R",
		description: "Lenguaje para análisis estadístico",
		color: "#276dc3",
		is_featured: true,
	},
	{
		name: "Perl",
		description: "Lenguaje poderoso para procesamiento de texto",
		color: "#39457e",
		is_featured: true,
	},
	{
		name: "Lua",
		description: "Lenguaje ligero y embebible",
		color: "#2c2d72",
		is_featured: true,
	},
	{
		name: "Haskell",
		description: "Lenguaje funcional puro",
		color: "#5d4f85",
		is_featured: true,
	},
	{
		name: "Elixir",
		description: "Lenguaje funcional para sistemas concurrentes",
		color: "#6e4a7e",
		is_featured: true,
	},

	// 30+ lenguajes adicionales
	{
		name: "F#",
		description: "Lenguaje funcional de Microsoft",
		color: "#378bba",
		is_featured: false,
	},
	{
		name: "Clojure",
		description: "Lenguaje funcional en la JVM",
		color: "#5881d8",
		is_featured: false,
	},
	{
		name: "Julia",
		description: "Lenguaje para computación científica",
		color: "#9558b2",
		is_featured: false,
	},
	{
		name: "Erlang",
		description: "Lenguaje para sistemas distribuidos",
		color: "#a90533",
		is_featured: false,
	},
	{
		name: "OCaml",
		description: "Lenguaje funcional tipado",
		color: "#ec6813",
		is_featured: false,
	},
	{
		name: "Nim",
		description: "Lenguaje eficiente y expresivo",
		color: "#ffe953",
		is_featured: false,
	},
	{
		name: "Crystal",
		description: "Lenguaje similar a Ruby pero compilado",
		color: "#000000",
		is_featured: false,
	},
	{
		name: "Zig",
		description: "Lenguaje de sistemas moderno",
		color: "#ec915c",
		is_featured: false,
	},
	{
		name: "D",
		description: "Lenguaje de sistemas con garbage collection",
		color: "#ba595e",
		is_featured: false,
	},
	{
		name: "Ada",
		description: "Lenguaje para sistemas críticos",
		color: "#02f88c",
		is_featured: false,
	},
	{
		name: "Fortran",
		description: "Lenguaje para computación científica",
		color: "#4d41b1",
		is_featured: false,
	},
	{
		name: "COBOL",
		description: "Lenguaje para aplicaciones empresariales",
		color: "#005ca5",
		is_featured: false,
	},
	{
		name: "Pascal",
		description: "Lenguaje educativo estructurado",
		color: "#e3f171",
		is_featured: false,
	},
	{
		name: "Delphi",
		description: "Desarrollo rápido de aplicaciones",
		color: "#cc342d",
		is_featured: false,
	},
	{
		name: "Visual Basic",
		description: "Lenguaje de Microsoft para RAD",
		color: "#945db7",
		is_featured: false,
	},
	{
		name: "Groovy",
		description: "Lenguaje dinámico para la JVM",
		color: "#4298b8",
		is_featured: false,
	},
	{
		name: "ActionScript",
		description: "Lenguaje para desarrollo Flash",
		color: "#882b0f",
		is_featured: false,
	},
	{
		name: "CoffeeScript",
		description: "JavaScript con sintaxis más limpia",
		color: "#244776",
		is_featured: false,
	},
	{
		name: "Elm",
		description: "Lenguaje funcional para frontend",
		color: "#60b5cc",
		is_featured: false,
	},
	{
		name: "PureScript",
		description: "Lenguaje funcional que compila a JavaScript",
		color: "#1d222d",
		is_featured: false,
	},
	{
		name: "ReasonML",
		description: "Sintaxis JavaScript sobre OCaml",
		color: "#dd4b39",
		is_featured: false,
	},
	{
		name: "Racket",
		description: "Lenguaje para programación de lenguajes",
		color: "#22228f",
		is_featured: false,
	},
	{
		name: "Scheme",
		description: "Dialecto minimalista de Lisp",
		color: "#1e4aec",
		is_featured: false,
	},
	{
		name: "Common Lisp",
		description: "Dialecto estándar de Lisp",
		color: "#3fb68b",
		is_featured: false,
	},
	{
		name: "Prolog",
		description: "Lenguaje de programación lógica",
		color: "#74283c",
		is_featured: false,
	},
	{
		name: "MATLAB",
		description: "Lenguaje para computación numérica",
		color: "#e16737",
		is_featured: false,
	},
	{
		name: "Mathematica",
		description: "Lenguaje para computación simbólica",
		color: "#dd1100",
		is_featured: false,
	},
	{
		name: "Tcl",
		description: "Lenguaje de scripting embebible",
		color: "#e4cc98",
		is_featured: false,
	},
	{
		name: "PowerShell",
		description: "Shell y lenguaje de scripting de Microsoft",
		color: "#012456",
		is_featured: false,
	},
	{
		name: "Bash",
		description: "Shell y lenguaje de scripting Unix",
		color: "#4eaa25",
		is_featured: false,
	},
	{
		name: "Assembly",
		description: "Lenguaje de bajo nivel",
		color: "#6e4c13",
		is_featured: false,
	},
	{
		name: "WebAssembly",
		description: "Formato binario para la web",
		color: "#654ff0",
		is_featured: false,
	},
	{
		name: "Solidity",
		description: "Lenguaje para smart contracts",
		color: "#363636",
		is_featured: false,
	},
	{
		name: "Move",
		description: "Lenguaje para blockchain",
		color: "#4b32c3",
		is_featured: false,
	},
	{
		name: "Cairo",
		description: "Lenguaje para StarkNet",
		color: "#ff6b35",
		is_featured: false,
	},
];

export async function seedLanguages() {
	console.log("🌱 Seeding languages...");

	try {
		let insertedCount = 0;

		for (const lang of languages) {
			try {
				// Usar ON CONFLICT DO NOTHING para evitar duplicados
				const result = await db`
          INSERT INTO languages (name, description, color, is_featured)
          VALUES (${lang.name}, ${lang.description}, ${lang.color}, ${lang.is_featured})
          ON CONFLICT (name) DO NOTHING
          RETURNING id
        `;

				if (result.length > 0) {
					insertedCount++;
				}
			} catch (error) {
				console.warn(`Warning: Could not insert language ${lang.name}:`, error);
			}
		}

		console.log(
			`✅ Seeded ${insertedCount} new languages (${languages.length} total in seed data)`,
		);
	} catch (error) {
		console.error("Error seeding languages:", error);
		throw error;
	}
}

// Función para obtener estadísticas de lenguajes
export async function getLanguageStats() {
	try {
		const totalResult = await db`SELECT COUNT(*) as count FROM languages`;
		const featuredResult =
			await db`SELECT COUNT(*) as count FROM languages WHERE is_featured = true`;

		const total = parseInt(totalResult[0]?.count as string || "0");
		const featured = parseInt(featuredResult[0]?.count as string || "0");

		return {
			total,
			featured,
			additional: total - featured,
		};
	} catch (error) {
		console.error("Error getting language stats:", error);
		return {
			total: 0,
			featured: 0,
			additional: 0,
		};
	}
}

// Función para actualizar datos de lenguajes existentes
export async function updateLanguagesData() {
	console.log("🔄 Updating existing languages data...");

	try {
		let updatedCount = 0;

		for (const lang of languages) {
			try {
				const result = await db`
          UPDATE languages 
          SET description = ${lang.description}, 
              color = ${lang.color}, 
              is_featured = ${lang.is_featured}
          WHERE name = ${lang.name}
        `;

				if (result.count > 0) {
					updatedCount++;
				}
			} catch (error) {
				console.warn(`Warning: Could not update language ${lang.name}:`, error);
			}
		}

		console.log(`✅ Updated ${updatedCount} languages`);
	} catch (error) {
		console.error("Error updating languages:", error);
		throw error;
	}
}

// Función para verificar integridad de los datos
export async function verifyLanguagesData(): Promise<{
	totalInDb: number;
	totalInSeed: number;
	missing: string[];
	extra: string[];
}> {
	try {
		const dbLanguages = await db`SELECT name FROM languages ORDER BY name`;
		const dbNames = dbLanguages.map((lang) => lang.name as string);
		const seedNames = languages.map((lang) => lang.name);

		const missing = seedNames.filter((name) => !dbNames.includes(name));
		const extra = dbNames.filter((name) => !seedNames.includes(name));

		return {
			totalInDb: dbNames.length,
			totalInSeed: seedNames.length,
			missing,
			extra,
		};
	} catch (error) {
		console.error("Error verifying languages data:", error);
		throw error;
	}
}
