// Firestore converter.
// const ref = firebase.app().firestore().collection("BATTERIES").withConverter(converter<Battery>());
export const converter = <T>() => ({
  toFirestore: (data: T) => data,
  fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) =>
    snap.data() as T,
});
