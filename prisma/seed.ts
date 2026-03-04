import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  user_type,
  provider_type,
  course_status,
  course_difficulty,
  content_type,
  question_type,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '55435421',
  database: 'courses_project_db',
});

const prisma = new PrismaClient({ adapter });

// ===== Random Helpers =====
function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ===== Image Pools =====
const PROFILE_PICTURES = [
  'https://randomuser.me/api/portraits/men/1.jpg',
  'https://randomuser.me/api/portraits/men/2.jpg',
  'https://randomuser.me/api/portraits/men/3.jpg',
  'https://randomuser.me/api/portraits/men/4.jpg',
  'https://randomuser.me/api/portraits/men/5.jpg',
  'https://randomuser.me/api/portraits/women/1.jpg',
  'https://randomuser.me/api/portraits/women/2.jpg',
  'https://randomuser.me/api/portraits/women/3.jpg',
  'https://randomuser.me/api/portraits/women/4.jpg',
  'https://randomuser.me/api/portraits/women/5.jpg',
];

// ===== Question Banks =====
const ESSAY_QUESTIONS = [
  {
    text: 'Explain REST vs GraphQL in detail. When would you choose one over the other?',
    answer:
      'REST is a resource-based architectural style using HTTP methods (GET, POST, PUT, DELETE) and fixed endpoints. GraphQL is a query language allowing clients to request exactly the data they need. REST is simpler and more cacheable; GraphQL reduces over-fetching and is better for complex, nested data requirements.',
    grade: 20,
  },
  {
    text: 'Describe the CAP theorem and its implications for distributed database design.',
    answer:
      'The CAP theorem states that a distributed system can only guarantee two of three properties: Consistency, Availability, and Partition Tolerance. Since partition tolerance is generally required in real networks, systems must trade off between consistency (CP systems like HBase) and availability (AP systems like Cassandra).',
    grade: 20,
  },
  {
    text: 'What is microservices architecture? Compare it with a monolithic approach.',
    answer:
      'Microservices break an application into small, independently deployable services each responsible for a specific business function. Unlike monoliths, microservices enable independent scaling, technology diversity, and fault isolation. However, they introduce distributed systems complexity including network latency, service discovery, and data consistency challenges.',
    grade: 25,
  },
  {
    text: 'Explain the concept of database indexing and its performance trade-offs.',
    answer:
      'A database index is a data structure (typically B-tree or hash) that speeds up data retrieval at the cost of additional storage and slower write operations. Indexes are beneficial for columns frequently used in WHERE clauses, JOINs, and ORDER BY. Over-indexing can degrade INSERT/UPDATE/DELETE performance.',
    grade: 20,
  },
  {
    text: 'What is JWT authentication? Describe its structure and security considerations.',
    answer:
      'JWT (JSON Web Token) is a compact, URL-safe token consisting of three Base64-encoded parts: Header (algorithm), Payload (claims), and Signature. It enables stateless authentication. Security considerations include using strong signing keys, setting short expiry times, validating all claims, and using HTTPS to prevent token interception.',
    grade: 20,
  },
  {
    text: 'Explain SOLID principles and provide an example for each.',
    answer:
      'SOLID: Single Responsibility (a class has one reason to change), Open/Closed (open for extension, closed for modification), Liskov Substitution (subtypes must be substitutable for base types), Interface Segregation (clients should not depend on unused interfaces), Dependency Inversion (depend on abstractions, not concretions).',
    grade: 25,
  },
  {
    text: 'Describe caching strategies (write-through, write-behind, read-through, cache-aside) and when to use each.',
    answer:
      'Cache-aside: app manages cache manually, good for read-heavy workloads. Read-through: cache handles reads transparently. Write-through: writes go to cache and DB simultaneously, ensures consistency. Write-behind (lazy): writes to cache first, DB later asynchronously — improves write performance but risks data loss.',
    grade: 20,
  },
  {
    text: 'What are database transactions and ACID properties? Why do they matter?',
    answer:
      'A transaction is a unit of work that must execute atomically. ACID: Atomicity (all or nothing), Consistency (data remains valid), Isolation (concurrent transactions do not interfere), Durability (committed data survives failures). ACID guarantees are critical for financial systems and any scenario requiring data integrity.',
    grade: 20,
  },
];

const TRUE_FALSE_QUESTIONS = [
  { text: 'PostgreSQL is a relational database.', correct: true, grade: 10 },
  { text: 'HTTP is a stateful protocol.', correct: false, grade: 10 },
  {
    text: 'Redis is primarily used as an in-memory data store.',
    correct: true,
    grade: 10,
  },
  {
    text: 'A foreign key constraint enforces referential integrity.',
    correct: true,
    grade: 10,
  },
  {
    text: 'GraphQL always fetches more data than REST APIs.',
    correct: false,
    grade: 10,
  },
  {
    text: 'Docker containers share the host operating system kernel.',
    correct: true,
    grade: 10,
  },
  {
    text: 'SQL injection can be prevented using parameterized queries.',
    correct: true,
    grade: 10,
  },
  { text: 'A primary key can contain NULL values.', correct: false, grade: 10 },
  {
    text: 'WebSockets support full-duplex communication.',
    correct: true,
    grade: 10,
  },
  {
    text: 'HTTPS encrypts only the response body, not headers.',
    correct: false,
    grade: 10,
  },
  {
    text: 'An index always speeds up both reads and writes.',
    correct: false,
    grade: 10,
  },
  {
    text: 'Node.js uses a single-threaded event loop.',
    correct: true,
    grade: 10,
  },
];

const MCQ_QUESTIONS = [
  {
    text: 'Which of the following is NOT a NoSQL database?',
    options: [
      { text: 'MongoDB', correct: false },
      { text: 'Redis', correct: false },
      { text: 'PostgreSQL', correct: true },
      { text: 'Cassandra', correct: false },
    ],
    grade: 15,
  },
  {
    text: 'Which HTTP status code indicates a resource was successfully created?',
    options: [
      { text: '200 OK', correct: false },
      { text: '201 Created', correct: true },
      { text: '204 No Content', correct: false },
      { text: '301 Moved Permanently', correct: false },
    ],
    grade: 15,
  },
  {
    text: 'Which design pattern is used by Express.js middleware?',
    options: [
      { text: 'Observer', correct: false },
      { text: 'Singleton', correct: false },
      { text: 'Chain of Responsibility', correct: true },
      { text: 'Factory', correct: false },
    ],
    grade: 15,
  },
  {
    text: 'What does the "N+1 query problem" refer to in ORMs?',
    options: [
      { text: 'Fetching N records with N+1 columns', correct: false },
      {
        text: 'Running one query + N additional queries for related data',
        correct: true,
      },
      { text: 'A pagination bug causing one extra record', correct: false },
      { text: 'N transactions plus one rollback', correct: false },
    ],
    grade: 15,
  },
  {
    text: 'Which of the following best describes eventual consistency?',
    options: [
      {
        text: 'All nodes return identical data at any point in time',
        correct: false,
      },
      {
        text: 'Data changes are never propagated across nodes',
        correct: false,
      },
      {
        text: 'All nodes will eventually converge to the same value',
        correct: true,
      },
      {
        text: 'Writes are immediately rejected if nodes disagree',
        correct: false,
      },
    ],
    grade: 15,
  },
  {
    text: 'Which algorithm is commonly used by databases for B-tree traversal in range queries?',
    options: [
      { text: 'Breadth-First Search', correct: false },
      { text: 'Depth-First Search', correct: false },
      { text: 'In-order traversal', correct: true },
      { text: 'Post-order traversal', correct: false },
    ],
    grade: 15,
  },
  {
    text: 'What is the purpose of a database connection pool?',
    options: [
      { text: 'To store query results in memory', correct: false },
      {
        text: 'To reuse existing connections instead of creating new ones',
        correct: true,
      },
      { text: 'To replicate data across servers', correct: false },
      { text: 'To encrypt database connections', correct: false },
    ],
    grade: 15,
  },
  {
    text: 'Which HTTP method is idempotent but NOT safe?',
    options: [
      { text: 'GET', correct: false },
      { text: 'POST', correct: false },
      { text: 'PUT', correct: true },
      { text: 'PATCH', correct: false },
    ],
    grade: 15,
  },
  {
    text: 'In a message queue system, what does "dead letter queue" mean?',
    options: [
      { text: 'A queue for high-priority messages', correct: false },
      {
        text: 'A queue that stores undeliverable or failed messages',
        correct: true,
      },
      {
        text: 'A queue that deletes messages after processing',
        correct: false,
      },
      { text: 'A queue used only for logging', correct: false },
    ],
    grade: 15,
  },
  {
    text: 'Which isolation level prevents dirty reads but allows non-repeatable reads?',
    options: [
      { text: 'Read Uncommitted', correct: false },
      { text: 'Read Committed', correct: true },
      { text: 'Repeatable Read', correct: false },
      { text: 'Serializable', correct: false },
    ],
    grade: 15,
  },
];

// Creates all questions for a lesson and returns their total grade sum
async function createQuestionsForLesson(lessonId: string): Promise<number> {
  let totalGrade = 0;

  // Pick 1–2 essay questions randomly
  const essayPool = randomSubset(ESSAY_QUESTIONS, 1, 2);
  for (const q of essayPool) {
    await prisma.questions.create({
      data: {
        lesson_id: lessonId,
        question_text: q.text,
        question_type: question_type.Essay,
        model_answer: q.answer,
        question_grade: q.grade,
      },
    });
    totalGrade += q.grade;
  }

  // Pick 2–3 true/false questions randomly
  const tfPool = randomSubset(TRUE_FALSE_QUESTIONS, 2, 3);
  for (const q of tfPool) {
    const tf = await prisma.questions.create({
      data: {
        lesson_id: lessonId,
        question_text: q.text,
        question_type: question_type.TrueFalse,
        question_grade: q.grade,
      },
    });
    await prisma.options.createMany({
      data: [
        { question_id: tf.id, option_text: 'True', is_correct: q.correct },
        { question_id: tf.id, option_text: 'False', is_correct: !q.correct },
      ],
    });
    totalGrade += q.grade;
  }

  // Pick 2–3 MCQ questions randomly
  const mcqPool = randomSubset(MCQ_QUESTIONS, 2, 3);
  for (const q of mcqPool) {
    const mcq = await prisma.questions.create({
      data: {
        lesson_id: lessonId,
        question_text: q.text,
        question_type: question_type.MultipleChoice,
        question_grade: q.grade,
      },
    });
    await prisma.options.createMany({
      data: q.options.map((opt) => ({
        question_id: mcq.id,
        option_text: opt.text,
        is_correct: opt.correct,
      })),
    });
    totalGrade += q.grade;
  }

  return totalGrade;
}

async function main() {
  console.log('🌱 Resetting and Seeding Database...');

  // ===== Cleanup (order matters: delete dependents first) =====
  console.log('🗑️  Cleaning up existing data...');
  await prisma.mcq_tf_answers.deleteMany();
  await prisma.essay_answers.deleteMany();
  await prisma.answers.deleteMany();
  await prisma.submissions.deleteMany();
  await prisma.options.deleteMany();
  await prisma.questions.deleteMany();
  await prisma.lessons.deleteMany();
  await prisma.messages.deleteMany();
  await prisma.enrollments.deleteMany();
  await prisma.cart_items.deleteMany();
  await prisma.payments.deleteMany();
  await prisma.carts.deleteMany();
  await prisma.courses.deleteMany();
  await prisma.categories.deleteMany();
  await prisma.local_credentials.deleteMany();
  await prisma.users.deleteMany();
  console.log('✅ Cleanup done.');

  const hashedPassword = await bcrypt.hash('12345678', 10);

  // ===== Teachers =====
  console.log('👨‍🏫 Creating professional teachers...');

  const TEACHERS_DATA = [
    { name: 'Michael Anderson', email: 'michael.anderson@lms.com' },
    { name: 'Sarah Johnson', email: 'sarah.johnson@lms.com' },
    { name: 'David Martinez', email: 'david.martinez@lms.com' },
    { name: 'Emily Thompson', email: 'emily.thompson@lms.com' },
    { name: 'Daniel Kim', email: 'daniel.kim@lms.com' },
    { name: 'Jessica Williams', email: 'jessica.williams@lms.com' },
    { name: 'Christopher Brown', email: 'chris.brown@lms.com' },
    { name: 'Olivia Davis', email: 'olivia.davis@lms.com' },
  ];

  const teachers = [];

  for (let i = 0; i < TEACHERS_DATA.length; i++) {
    const t = TEACHERS_DATA[i];

    const teacher = await prisma.users.create({
      data: {
        email: t.email,
        username: t.name,
        image: PROFILE_PICTURES[i % PROFILE_PICTURES.length],
        type: user_type.Teacher,
        provider: provider_type.local,
        isprofilecomplete: true,
        local_credentials: {
          create: {
            password_hash: hashedPassword,
            email_verified: true,
          },
        },
      },
    });

    teachers.push(teacher);
  }

  // ===== Students =====
  console.log('👨‍🎓 Creating students...');
  const students = [];
  for (let i = 1; i <= 20; i++) {
    const student = await prisma.users.create({
      data: {
        email: `student${i}@lms.com`,
        username: `student${i}`,
        image: randomFrom(PROFILE_PICTURES),
        type: user_type.Student,
        provider: provider_type.local,
        local_credentials: {
          create: {
            password_hash: hashedPassword,
            email_verified: true,
          },
        },
      },
    });

    students.push(student);
  }

  // ===== Categories =====
  console.log('📂 Creating categories...');
  const categories = await Promise.all([
    prisma.categories.create({ data: { name: 'Backend Development' } }),
    prisma.categories.create({ data: { name: 'Frontend Development' } }),
    prisma.categories.create({ data: { name: 'DevOps & Cloud' } }),
    prisma.categories.create({ data: { name: 'Mobile Development' } }),
    prisma.categories.create({ data: { name: 'Data Science' } }),
    prisma.categories.create({ data: { name: 'Cybersecurity' } }),
  ]);

  const COURSE_THUMBNAILS = [
    'https://images.unsplash.com/photo-1555066931-4365d14431b9?w=800',
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800',
    'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
    'https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=800',
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800',
    'https://images.unsplash.com/photo-1517433456452-f9633a875f6f?w=800',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
    'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=800',
    'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=800',
    'https://images.unsplash.com/photo-1537432376769-00a9c5be8f5c?w=800',
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800',
    'https://images.unsplash.com/photo-1508780709619-79562169bc64?w=800',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
    'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800',
    'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800',
    'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=800',
    'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=800',
    'https://images.unsplash.com/photo-1483058712412-4245e9b90334?w=800',
    'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?w=800',
    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800',
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
    'https://images.unsplash.com/photo-1522199710521-72d69614c702?w=800',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800',
    'https://images.unsplash.com/photo-1507149833265-60c372daea22?w=800',
    'https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=800',
    'https://images.unsplash.com/photo-1506765515384-028b60a970df?w=800',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800',
    'https://images.unsplash.com/photo-1521790797524-b2497295b8a0?w=800',
    'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=800',
    'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800',
    'https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=800',
    'https://images.unsplash.com/photo-1518773553398-650c184e0bb3?w=800',
    'https://images.unsplash.com/photo-1519163219899-21d2bb723b3e?w=800',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800',
    'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800',
    'https://images.unsplash.com/photo-1523473827532-77c2d9d7e1f8?w=800',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
    'https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=800',
    'https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?w=800',
    'https://images.unsplash.com/photo-1515876305429-2c94a0d77bcb?w=800',
    'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=800',
    'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800',
    'https://images.unsplash.com/photo-1519337265831-281ec6cc8514?w=800',
    'https://images.unsplash.com/photo-1522252234503-e356532cafd5?w=800',
  ];

  // ===== Create 50 Courses =====
  console.log('📚 Creating 50 courses...');

  const REAL_COURSES = {
    'Backend Development': [
      'Node.js Backend API Masterclass',
      'Advanced REST API Design with Express',
      'NestJS Zero to Hero',
      'Microservices Architecture with Node.js',
      'Building Scalable APIs with PostgreSQL',
      'JWT Authentication & Authorization Deep Dive',
      'GraphQL API Development with Apollo',
      'Clean Architecture in Backend Systems',
    ],
    'Frontend Development': [
      'React.js Complete Guide',
      'Next.js Full Stack Bootcamp',
      'Advanced TypeScript for Frontend Developers',
      'Modern JavaScript (ES6+) Mastery',
      'Building Responsive UI with TailwindCSS',
      'Frontend Performance Optimization',
      'State Management with Redux Toolkit',
      'Vue.js 3 Composition API Deep Dive',
    ],
    'DevOps & Cloud': [
      'Docker & Kubernetes Practical Guide',
      'AWS Cloud Practitioner Bootcamp',
      'CI/CD with GitHub Actions',
      'Infrastructure as Code with Terraform',
      'Linux for DevOps Engineers',
      'Monitoring & Logging with Prometheus',
      'Nginx & Reverse Proxy Configuration',
    ],
    'Mobile Development': [
      'Flutter & Dart Complete Bootcamp',
      'React Native From Scratch',
      'Android Development with Kotlin',
      'iOS Development with SwiftUI',
      'Building Cross-Platform Apps',
    ],
    'Data Science': [
      'Python for Data Science & Analysis',
      'Machine Learning with Scikit-Learn',
      'Deep Learning with TensorFlow',
      'Data Visualization with Matplotlib',
      'SQL for Data Analysis',
      'Pandas & NumPy Mastery',
    ],
    Cybersecurity: [
      'Ethical Hacking & Penetration Testing',
      'Web Application Security (OWASP)',
      'Network Security Fundamentals',
      'Linux for Hackers',
      'Bug Bounty Hunting Guide',
      'Cryptography Basics for Developers',
      'Secure Coding Practices',
    ],
  };
  console.log('📚 Creating realistic courses...');

  for (const category of categories) {
    const courseNames = REAL_COURSES[category.name];

    for (const title of courseNames) {
      const teacher = randomFrom(teachers);

      const course = await prisma.courses.create({
        data: {
          title: title,
          description: `${title} - Complete professional training program`,
          thumbnail_url: randomFrom(COURSE_THUMBNAILS),
          teacher_id: teacher.id,
          category_id: category.id,
          difficulty: randomFrom([
            course_difficulty.Beginner,
            course_difficulty.Intermediate,
            course_difficulty.Advanced,
          ]),
          price: Math.floor(Math.random() * 1000),
          status: course_status.Approved,
          isReady: true,
        },
      });

      // Random enrollments
      const enrolledStudents = randomSubset(students, 5, 15);
      for (const student of enrolledStudents) {
        await prisma.enrollments.create({
          data: {
            student_id: student.id,
            course_id: course.id,
          },
        });
      }

      // Lessons (first must be video)
      const lessonsCount = Math.floor(Math.random() * 4) + 3;

      for (let l = 1; l <= lessonsCount; l++) {
        let lesson;

        if (l === 1) {
          lesson = await prisma.lessons.create({
            data: {
              title: `Introduction to ${title}`,
              order_number: l,
              content_type: content_type.Video,
              course_id: course.id,
              video_url: 'https://samplelib.com/lib/preview/mp4/sample-5s.mp4',
              video_thumbnail: randomFrom(COURSE_THUMBNAILS),
              isReady: true,
            },
          });
        } else {
          lesson = await prisma.lessons.create({
            data: {
              title: `Quiz ${l - 1} - ${title}`,
              order_number: l,
              content_type: content_type.Quiz,
              course_id: course.id,
              isReady: true,
            },
          });

          const totalGrade = await createQuestionsForLesson(lesson.id);

          await prisma.lessons.update({
            where: { id: lesson.id },
            data: { quiz_grade: totalGrade },
          });
        }

        await prisma.courses.update({
          where: { id: course.id },
          data: { lessons_number: { increment: 1 } },
        });
      }
    }
  }

  console.log('🎉 50 courses created successfully!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
