// 1. 단일 필드 인덱스 생성 및 성능 비교
const start = Date.now();
db.customers.find({ email: "example@example.com" }).explain("executionStats");
const before = Date.now() - start;

db.customers.createIndex({ email: 1 });

const startAfter = Date.now();
db.customers.find({ email: "example@example.com" }).explain("executionStats");
const after = Date.now() - startAfter;

console.log(`Before Index: ${before}ms, After Index: ${after}ms`);

// 2. 복합 인덱스 생성 및 다중 필드 쿼리 최적화
db.orders.createIndex({ customerId: 1, orderDate: -1 });
db.orders.find({ customerId: 12345, orderDate: { $gte: ISODate("2023-01-01") } }).sort({ orderDate: -1 });

// 3. 텍스트 인덱스 활용한 검색
db.products.createIndex({ description: "text" });
db.products.find({ $text: { $search: "고급 전자제품" } });

// 4. 다중 컬렉션 트랜잭션 구현
const session = client.startSession();
session.startTransaction();

try {
  db.customers.updateOne({ _id: 1 }, { $set: { balance: 500 } }, { session });
  db.transactions.insertOne({ customerId: 1, amount: -500, type: "withdrawal" }, { session });
  session.commitTransaction();
} catch (e) {
  session.abortTransaction();
} finally {
  session.endSession();
}

// 5. 트랜잭션 중 오류 발생 시 롤백 확인
const session = client.startSession();
session.startTransaction();
try {
  db.customers.insertOne({ _id: 2, name: "Alice" }, { session });
  db.customers.insertOne({ _id: 2, name: "Bob" }, { session }); // 의도적인 오류 발생
  session.commitTransaction();
} catch (e) {
  session.abortTransaction();
  console.log("Transaction aborted due to error:", e);
} finally {
  session.endSession();
}

// 6. 트랜잭션 내 데이터 검증
const session = client.startSession();
session.startTransaction();
try {
  const customer = db.customers.findOne({ _id: 1 }, { session });
  if (customer.balance < 1000) throw new Error("Insufficient funds");
  db.customers.updateOne({ _id: 1 }, { $inc: { balance: -1000 } }, { session });
  db.transactions.insertOne({ customerId: 1, amount: -1000, type: "purchase" }, { session });
  session.commitTransaction();
} catch (e) {
  session.abortTransaction();
  console.log("Transaction aborted:", e.message);
} finally {
  session.endSession();
}

// 7. 트랜잭션 중첩 사용
const session = client.startSession();
session.startTransaction();
try {
  db.accounts.updateOne({ _id: 1 }, { $inc: { balance: -100 } }, { session });
  session.withTransaction(() => {
    db.accounts.updateOne({ _id: 2 }, { $inc: { balance: 100 } }, { session });
  });
  session.commitTransaction();
} catch (e) {
  session.abortTransaction();
} finally {
  session.endSession();
}
