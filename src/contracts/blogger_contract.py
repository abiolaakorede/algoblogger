from pyteal import *
from util import convert_uint_to_bytes


class Blogger:
    class Variables:  # 2 global ints, 11 global bytes
        author = Bytes("AUTHOR")  # bytes
        title = Bytes("TITLE")  # bytes
        image = Bytes("IMAGE")  # bytes
        tippers = Bytes("TIPPERS")  # uint
        total = Bytes("TOTAL")  # uint
        owner = Bytes("OWNER")  # bytes
        # for the blog content we'll fill up the 7 key value pairs with 127 bytes each using key indexes 0 - 7,  as we're only allowed 128 bytes per key value pair
        # this increases the blog content by 889 bytes, we can't go higher than this on app creation as doing so will return the dynamic cost budget exceeded error as on app creation local program cost max is 700 and this exceeds it

    class AppMethods:
        tip = Bytes("tip")

    @Subroutine(TealType.none)
    def fill_blog(blog_data: Expr):
        counter = ScratchVar(TealType.uint64)
        length_of_bytes = ScratchVar(TealType.uint64)
        length_of_bytes_to_store = ScratchVar(TealType.uint64)
        starting_index = ScratchVar(TealType.uint64)
        current_bytes = ScratchVar(TealType.bytes)
        key_index = ScratchVar(TealType.bytes)
        return Seq([
            length_of_bytes.store(Len(blog_data)),

            # iterate through indexes from 0 - 7
            For(
                counter.store(Int(0)), counter.load() < Int(
                    8), counter.store(counter.load() + Int(1))
            ).Do(

                # convert index to string
                key_index.store(convert_uint_to_bytes(counter.load())),

                # store starting index
                starting_index.store(Int(127) * counter.load()),

                # if length of bytes is equal to zero
                If(length_of_bytes.load() == Int(0))
                .Then(
                    # break out of loop
                    Break()
                )
                # else if remaining length of blog data bytes is greater than 127.
                .ElseIf(length_of_bytes.load() > Int(127))
                .Then(
                    Seq([
                        # reduce bytes length by 127
                        length_of_bytes.store(
                            length_of_bytes.load() - Int(127)),

                        # store the length of bytes to store
                        length_of_bytes_to_store.store(Int(127)),
                    ])
                ) .Else(
                    # store the length of bytes left to store
                    length_of_bytes_to_store.store(length_of_bytes.load()),

                    # update length_of_bytes
                    length_of_bytes.store(
                        length_of_bytes.load() - length_of_bytes_to_store.load())
                ),

                # Extract bytes from blog_data
                current_bytes.store(
                    Extract(blog_data, starting_index.load(), length_of_bytes_to_store.load())),

                # Store bytes in global state
                App.globalPut(key_index.load(), current_bytes.load())
            )
        ])

    def application_creation(self):
        return Seq([
            Assert(
                # checks
                # The length of arguments passed should be 4
                # The note attached to the transaction must be "algoblogger:re11"
                And(
                    Txn.application_args.length() == Int(4),
                    Txn.note() == Bytes("algoblogger:re11")
                )
            ),

            # Store the transaction arguments into the applications's global's state
            App.globalPut(self.Variables.author, Txn.application_args[0]),
            App.globalPut(self.Variables.title, Txn.application_args[2]),
            App.globalPut(self.Variables.image, Txn.application_args[3]),
            App.globalPut(self.Variables.tippers, Int(0)),
            App.globalPut(self.Variables.total, Int(0)),
            App.globalPut(self.Variables.owner, Txn.sender()),

            # fill blog in global state
            self.fill_blog(Txn.application_args[1]),

            Approve()
        ])

    def tipPost(self):
        return Seq([
            #
            Assert(
                And(
                    # The number of transactions within the group transaction must be exactly 2.
                    # first one being the tip function and the second being the payment transactions
                    Global.group_size() == Int(2),
                    # The number of arguments attached to the transaction should be exactly 2.

                    Txn.application_args.length() == Int(2),
                ),
            ),
            Assert(
                And(
                    Gtxn[1].type_enum() == TxnType.Payment,
                    Gtxn[1].receiver() == App.globalGet(
                        self.Variables.owner),
                    Gtxn[1].sender() == Gtxn[0].sender(),
                    Gtxn[1].amount() == Btoi(Txn.application_args[1]),
                )
            ),

            # increase the number of tippers of a post
            App.globalPut(self.Variables.tippers, App.globalGet(
                self.Variables.tippers) + Int(1)),
            # increase the total of the tips
            App.globalPut(self.Variables.total, App.globalGet(
                self.Variables.total) + Btoi(Txn.application_args[1])),
            Approve()
        ])

    def application_deletion(self):
        return Return(Txn.sender() == Global.creator_address())

    def application_start(self):
        return Cond(
            [Txn.application_id() == Int(0), self.application_creation()],
            [Txn.on_completion() == OnComplete.DeleteApplication,
             self.application_deletion()],
            [Txn.application_args[0] == self.AppMethods.tip, self.tipPost()],
        )

    def approval_program(self):
        return self.application_start()

    def clear_program(self):
        return Return(Int(1))
