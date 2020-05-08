const {ApolloServer, gql} = require('apollo-server');
const {find, filter, remove, findIndex} = require('lodash');
const {PubSub} = require('apollo-server');
const pubsub = new PubSub();

/*A schema is a collection of type definitions (hence "typeDefs")
that together define the "shape" of queries that are executed against
your data.*/
var last;
const typeDefs = gql`
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.
  type Book {
    id: ID
    title: String
    authors: [Author]
  }

  type Author {
    id: ID
    name: String
    age: Int
    books: [Book]
  }

  input AuthorInput {
    name: String
    age: Int
  }

  input BookInput{
    title: String!,
    authors: [AuthorInput]!
  }
  
  input BookInputForUpdate{
    id: ID!,
    title: String!,
    authors: [AuthorInput]!
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    books: [Book],
    bookById(id: ID!): Book,
    booksByTitle(title: String!): Book,
    booksByAuthor(name: String!): [Book],
  }
  type Mutation {
    createBook(book: BookInput): Book,
    updateBook(book: BookInputForUpdate!):[Book],
    deleteBook(id: ID!):[Book],
  } 
  type Subscription {
    newBook: Book
  }
`;


const authors = [
    {
        id: 1,
        name: 'Author1',
        age: 22,
    },
    {
        id: 2,
        name: 'Author2',
        age: 25,
    },
];

const books = [
    {
        id: '1',
        title: 'Book1',
        authors: [authors[0],
            authors[1]],
    },
    {
        id: '2',
        title: 'Book2',
        authors: [authors[1]],
    },
    {
        id: '3',
        title: 'Book3',
        authors: [authors[0]],
    }

];

const BOOK_CREATED = 'BOOK_CREATED';
/*Resolvers define the technique for fetching the types defined in the
schema. This resolver retrieves books from the "books" array above.*/
const resolvers = {
    Query: {
        books: () => books,
        bookById: (parent, {id}) => {
            return find(books, {id: id});
        },
        booksByTitle: (parent, {title}) => {
            return find(books, {title: title});
        },
        booksByAuthor: (parent, {name}) => {
            return filter(books, {authors: authors.filter(author => author.name === name)});
        },
    },
    Mutation: {
        createBook: (parent, {book}) => {
            pubsub.publish(BOOK_CREATED, {newBook: book});
            let newBook = {
                id: Number(books.length + 1).toString(),
                title: book.title,
                authors: book.authors
            };
            books.push(newBook);
            return books[books.length - 1];
        },
        updateBook: (parent, {book}) => {
            let index = findIndex(books, {id: book.id});
            if (index === -1) {
                return books;
            }
            books.splice(index, 1, {id: book.id, title: book.title, authors: book.authors});
            return books;
        },
        deleteBook: (parent, {id}) => {
            remove(books, {id: id});
            return books;
        }
    },
    Subscription: {
        newBook: {
            subscribe: () => pubsub.asyncIterator([BOOK_CREATED]),
        },
    },
};

/*The ApolloServer constructor requires two parameters: your schema
definition and your set of resolvers.*/
const server = new ApolloServer({typeDefs, resolvers});

// The `listen` method launches a web server.
server.listen().then(({url}) => {
    console.log(`🚀  Server ready at ${url}`);
});
