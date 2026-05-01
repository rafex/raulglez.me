import { defineConfig } from 'vite';
import pugPlugin from 'vite-plugin-pug';
import path from 'path';

const options = {};

const locals = {
  header: {
    name: 'Raúl Eduardo González Argote',
    title: 'Lic. Sistemas Computacionales Administrativos',
    role: 'Arquitecto TI',
    vision: "El uso de las TIC's en un entorno empresarial e individual para facilitar y solventar problemáticas que en estas existen. Proveer soluciones con base a las tecnologías actuales tanto privadas/costo y OpenSource/Free. Análisis y arquitectura de aplicaciones de alto impacto junto con su infraestructura escalable y replicable.",
  },
  contact: {
    phone: '55 80 99 50 29',
    email: 'rafex@rafex.dev',
    location: 'Ciudad de México, Benito Juárez',
    website: 'raulglez.me',
  },
  about: 'Arquitecto de software con más de 14 años de experiencia en desarrollo de aplicaciones empresariales, liderazgo de equipos y diseño de arquitecturas escalables. Especialista en Java (J2EE/J2SE), Spring, microservicios y plataformas cloud (Azure, AWS, GCP). Apasionado por el Open Source, la automatización de infraestructura y la docencia técnica.',
  experience: [
    { role: 'Arquitecto TI', company: 'BBVA México', period: 'Enero 2023 - Presente', location: 'CDMX', highlights: ['Arquitecto de la Plataforma de Firma (Firma Autógrafa, derivados, diferida).', 'Component Owner de la Plataforma de Evidencias.', 'Tecnologías NextGen Ether: ASO, APX, Epsilon.'] },
    { role: 'Full Stack Senior', company: 'Ready Mind', period: 'Jul 2021 - Enero 2023', location: 'CDMX', highlights: ['Liderar equipos de desarrollo.', 'Migración de arquitecturas a Azure.', 'Soporte de incidentes productivos.', 'Java, Spring Boot, Azure (AKS, Functions, SQL Server, API Gateway), Angular, React.'] },
    { role: 'Consultor Independiente', company: 'Freelance', period: 'Mar 2018 - Jul 2021', location: 'CDMX', highlights: ['Sistemas a medida con Angular, Java, Python, Spring, PostgreSQL, GCP, AWS.', 'Microservicios Java con apenas 10MB (Java puro).', 'Marketing Digital, SEO, SEM.'] },
    { role: 'Profesor de cursos Java', company: 'KMMX', period: 'Abr 2019 - Jun 2019', location: 'CDMX', highlights: ['Módulo 1: Introducción a la programación.', 'Módulo 3: Fundamentos de programación con Java.', 'Módulo 4: Estructuras de Datos y algoritmos con Java.'] },
    { role: 'Líder de Desarrollo - Arquitecto Web', company: 'HITSS', period: 'Ene 2018 - Mar 2018', location: 'CDMX', highlights: ['Portal de venta de planes postpago para Claro Colombia.', 'WebSphere Portal y servicios REST en JBoss.', 'SparkJava, Spring 4, JDK8, MyBatis3, MySQL.'] },
    { role: 'Arquitecto de Software', company: 'Seguritech', period: 'Ago 2017 - Nov 2017', location: 'CDMX', highlights: ['Arquitectura tolerante a fallos, High Availability.', 'Integración continua, pruebas y monitoreo.', 'Shell scripts para automatizar despliegues.'] },
    { role: 'Arquitecto de Software', company: 'Gesfor', period: 'Jul 2017', location: 'CDMX', highlights: ['Arquitectura para INDRA-SEGOB con Java, JBoss, Spring, Bootstrap.', 'Gestión de recursos de TI.'] },
    { role: 'Arquitecto de Soluciones', company: 'Teknei', period: 'Oct 2016 - Jul 2017', location: 'CDMX', highlights: ['Gestión de equipo multidisciplinario (Java, Android, Python, iOS).', 'Integración con Odoo, Middleware Linux.', 'Soluciones OpenSource para economizar operación.'] },
    { role: 'Business Process Owner', company: 'Banorte - EISEI', period: 'Jul 2016 - Oct 2016', location: 'CDMX', highlights: ['Automatización de conciliación con SAP HANA y Data Services.'] },
    { role: 'Líder Técnico – Java Sr.', company: 'SEGOB', period: 'Dic 2016', location: 'CDMX', highlights: ['Reingeniería de código Java para estándares de gobierno.', 'Definición de procesos de desarrollo con GIT.'] },
    { role: 'Líder Técnico', company: 'Adesis Netlife - GFT', period: 'Ene 2014 - Jul 2016', location: 'CDMX', highlights: ['BBVA Bancomer y Organización Editorial Mexicana.', 'Portal de GNP con WebSphere Portal.', 'Patrones de diseño y Code Clean.'] },
    { role: 'Programador Analista Java Sr.', company: 'Adesis Netlife', period: 'Ene 2013 - Ene 2014', location: 'CDMX', highlights: ['Spring, MyBatis, FreeMarker, CXF, LDAP, Jetty, Tomcat.', 'Servicios RESTFul y aplicaciones J2EE.'] },
    { role: 'Programador Analista Sr.', company: 'Consulting & Enterprise Integrations', period: 'Ene 2012 - Dic 2012', location: 'CDMX', highlights: ['Portlets JSR 286 para portal corporativo de GNP.', 'Integración con Alfresco y Liferay.'] },
    { role: 'Desarrollador de Software MAVI', company: 'Fac. de Contaduría, Universidad Veracruzana', period: 'Mar 2011 - Dic 2011', location: 'Xalapa, Ver.', highlights: ['Software MAVI de maratones nacionales ANFECA.', 'Migración PHP4 a PHP5, CSS3 y JavaScript.'] },
    { role: 'Programador Freelancer', company: 'Independiente', period: '2009 - 2011', location: 'CDMX', highlights: ['Formularios Java Swing con SQLite, MySQL, Oracle.', 'Sitios web con CSS3, HTML5, JavaScript y PHP.'] },
  ],
  skills: {
    technical: [
      'Java (J2EE, J2SE) — 14+ años',
      'Spring, Spring Boot',
      'Microservicios',
      'RESTful APIs, SOAP',
      'JavaScript, TypeScript',
      'Angular, React',
      'Python',
      'PHP',
      'Shell Scripting',
      'Maven, Gradle',
      'Git, SVN',
      'Jenkins, CI/CD',
      'Docker, LXC, Podman',
      'Kubernetes (AKS)',
      'MySQL, PostgreSQL, Oracle, SQL Server',
      'MongoDB, Redis',
      'AWS, Azure, GCP',
      'Linux (Debian, CentOS, Ubuntu)',
      'Nginx, Apache, Tomcat, JBoss, WAS',
      'Alfresco, Liferay, WebSphere Portal',
      'HTML5, CSS3, Sass',
      'MyBatis, Hibernate, JPA',
      'JUnit, JMeter, Selenium',
    ],
    competencies: [
      'Abstracción de problemas',
      'Aprendizaje rápido de nuevos lenguajes',
      'Trabajo en equipo',
      'Manejo de personal',
      'Liderazgo técnico',
      'Trabajo bajo presión',
      'Facilidad de palabra',
      'Gestión de tiempos y recursos',
    ],
  },
  certifications: [
    { title: 'Sun Certified Associate for Java Platform, Standard Edition', code: '310-019', year: '2008', id: 'SR3538468' },
    { title: 'Sun Certified Programmer for the Java 2 Platform, Standard Edition', code: '310-055', year: '2008', id: 'SR3538468' },
    { title: 'Sun Certified Web Component Developer for Java Platform, Enterprise Edition 5', code: 'v.3', year: '2009', id: 'SR3538468' },
  ],
  conferences: [
    { title: 'Ingeniería Social', event: 'Evento MEG', location: 'Córdoba, Veracruz' },
    { title: 'Como dejar de pensar Windows', event: 'FLISOL 2011', location: 'Orizaba, Veracruz' },
    { title: 'La fuerza de las comunidades', event: 'Campus Party México 2011', location: 'CDMX' },
    { title: 'Las redes sociales en México', event: 'Congreso Internacional en Sistemas Computacionales Administrativos', location: '2011' },
    { title: 'Taller de Python', event: 'Congreso Internacional en Sistemas Computacionales Administrativos', location: '2011' },
    { title: 'Computación en la NUBE', event: '55º Aniversario del Instituto Tecnológico de Orizaba', location: '2012' },
    { title: 'Como dejar de pensar Windows', event: 'FLISOL 2015', location: 'Querétaro' },
    { title: 'Regalando código también se gana', event: 'FLISOL 2014', location: 'Querétaro' },
  ],
  projects: [
    { name: 'Blog theworldofrafex', url: 'https://theworldofrafex.blog', description: 'Blog personal sobre tecnología desde 2006.' },
    { name: 'Trolltime', url: 'http://trolltime.com', description: 'Fundador del sitio de entretenimiento.' },
    { name: 'Simple MySQL en Java', url: 'https://sourceforge.net/projects/simplemysqlenja/', description: 'API para simplificar conexiones MySQL en Java.' },
    { name: 'Ether Framework', url: 'https://github.com/rafex/ether', description: 'API framework para desarrollo Java.' },
    { name: 'donde.in', url: 'http://www.donde.in', description: 'Colaborador en blog de tecnología.' },
    { name: 'entermedia.mx', url: 'http://entermedia.mx', description: 'Colaborador en blog de tecnología.' },
  ],
};

export default defineConfig({
  plugins: [pugPlugin(options, locals)],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  preview: {
    port: 4173,
  },
});
